/**
 * frontend/src/components/tv/TVView.tsx
 * Screen (h): Live IPTV Television & Wildlife Stream Desk (PRD C Category 5B Fixes).
 * Broadsheet broadcast frame (true 16:9), resizable panels, HLS stream proxy player,
 * dedicated mute button with 'm' key shortcut, quick switcher with Name (Country) disambiguation,
 * multiline channel cards with tooltips and health status badges, and enhanced fallback actions.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAppStore } from '../../store/useAppStore';
import type { TvChannel } from '../../types';
import {
  calculateHealthRating,
  renderHealthDots,
  getVlcUrl,
  filterChannels,
  type TvShelf,
} from '../../utils/tv';
import {
  Tv,
  Heart,
  Activity,
  ExternalLink,
  Maximize,
  Search,
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  Compass,
  Radio,
  Copy,
  Check,
  Youtube,
  PictureInPicture2,
  Edit3,
  Trash2,
  AlertTriangle,
  SkipForward,
} from 'lucide-react';
import { toast } from 'sonner';
import { AddYouTubeChannelModal } from './AddYouTubeChannelModal';
import { sseBus } from '../../lib/sseBus';

function getCountryFlag(code?: string | null): string {
  if (!code || code.length !== 2) return '🌐';
  const offset = 127397;
  const chars = [...code.toUpperCase()].map((c) => c.charCodeAt(0) + offset);
  return String.fromCodePoint(...chars);
}

export function getYouTubeEmbedUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  // 1. /watch?v=VIDEO_ID
  const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vMatch) {
    return `https://www.youtube-nocookie.com/embed/${vMatch[1]}?autoplay=1&mute=1&enablejsapi=1`;
  }
  // 2. youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) {
    return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}?autoplay=1&mute=1&enablejsapi=1`;
  }
  // 3. /live/VIDEO_ID
  const liveMatch = trimmed.match(/\/live\/([a-zA-Z0-9_-]{11})/);
  if (liveMatch) {
    return `https://www.youtube-nocookie.com/embed/${liveMatch[1]}?autoplay=1&mute=1&enablejsapi=1`;
  }
  // 4. If already an embed URL
  if (trimmed.includes('/embed/')) {
    const sep = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${sep}autoplay=1&mute=1&enablejsapi=1`;
  }
  // 5. Raw 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube-nocookie.com/embed/${trimmed}?autoplay=1&mute=1&enablejsapi=1`;
  }
  return trimmed;
}

export const TVView: React.FC<{ forcedOpen?: boolean; forcedSelectedChannel?: TvChannel }> = ({
  forcedOpen,
  forcedSelectedChannel,
}) => {
  const isTvViewOpenStore = useAppStore((s) => s.isTvViewOpen);
  const isTvViewOpen = forcedOpen !== undefined ? forcedOpen : isTvViewOpenStore;
  const setTvViewOpen = useAppStore((s) => s.setTvViewOpen);
  const selectedTvChannelId = useAppStore((s) => s.selectedTvChannelId);
  const setSelectedTvChannelId = useAppStore((s) => s.setSelectedTvChannelId);
  const setActiveTvStream = useAppStore((s) => s.setActiveTvStream);
  const setTvMiniPlayerOpen = useAppStore((s) => s.setTvMiniPlayerOpen);

  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [allChannels, setAllChannels] = useState<TvChannel[]>([]);
  const [activeShelf, setActiveShelf] = useState<TvShelf>('all');
  const [subpage, setSubpage] = useState<'live' | 'faulty' | 'stopped'>('live');
  const [subpageCounts, setSubpageCounts] = useState({ live: 0, faulty: 0, stopped: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [includeDead, setIncludeDead] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<TvChannel | null>(
    forcedSelectedChannel || null,
  );
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{ isAlive: boolean; latencyMs: number } | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Mute & Volume state with localStorage persistence (PRD C Category 5B §5)
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return true;
    try {
      const saved = localStorage.getItem('tv_muted');
      return saved !== null ? saved === 'true' : true; // Autoplay starts muted per browser standards
    } catch {
      return true;
    }
  });
  const [volume, setVolume] = useState(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 0.8;
    try {
      const saved = localStorage.getItem('tv_volume');
      return saved !== null ? parseFloat(saved) : 0.8;
    } catch {
      return 0.8;
    }
  });

  const [playbackMethod, setPlaybackMethod] = useState<'hls' | 'youtube' | 'vlc'>('hls');
  const [isAddYoutubeOpen, setIsAddYoutubeOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [editingChannel, setEditingChannel] = useState<TvChannel | null>(null);
  const [editUrlInput, setEditUrlInput] = useState('');
  const [editNameInput, setEditNameInput] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Fetch subpages counts (live, faulty, stopped)
  const fetchSubpageCounts = async () => {
    try {
      const res = await fetch('/api/tv/subpages/counts');
      if (res.ok) {
        const data = await res.json();
        setSubpageCounts(data);
      }
    } catch (_) {}
  };

  // Fetch channels list with subpage filtering
  const fetchChannels = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const res = await fetch(`/api/tv/channels?subpage=${subpage}&include_dead=true`);
      if (res.ok) {
        const data = await res.json();
        const items: TvChannel[] = data.items || [];
        setChannels(items);

        // Keep active channel metadata in sync without replacing active playback unless removed/unset
        // Never invoke external store setters inside a React state updater!
        setSelectedChannel((prev) => {
          if (!prev) {
            return items.length > 0 ? items.find((c) => c.is_alive) || items[0]! : null;
          }
          const updatedMatch = items.find((c) => c.id === prev.id);
          if (updatedMatch) return { ...prev, ...updatedMatch };
          if (!opts?.silent && items.length > 0) {
            return items.find((c) => c.is_alive) || items[0]!;
          }
          return prev;
        });
      }

      // Fetch all channels for quick switcher
      const resAll = await fetch('/api/tv/channels?include_dead=true');
      if (resAll.ok) {
        const allData = await resAll.json();
        setAllChannels(allData.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch TV channels:', err);
    }
  }, [subpage, setSelectedTvChannelId]);

  useEffect(() => {
    if (isTvViewOpen) {
      fetchChannels();
      fetchSubpageCounts();
    }
  }, [isTvViewOpen, subpage, fetchChannels]);

  // Live SSE updates for TV health/favorites/catalog changes without remounting active stream
  useEffect(() => {
    const unsub = sseBus.subscribeMany(['tv_health_update', 'resync'], (event, payload) => {
      if (!useAppStore.getState().isTvViewOpen) return;
      if (event === 'tv_health_update' && payload && typeof payload === 'object') {
        const p = payload as { channel_id?: number; is_alive?: boolean; channel?: TvChannel };
        if (typeof p.channel_id === 'number' && typeof p.is_alive === 'boolean') {
          setChannels((prev) =>
            prev.map((c) => (c.id === p.channel_id ? { ...c, is_alive: p.is_alive! } : c)),
          );
          setAllChannels((prev) =>
            prev.map((c) => (c.id === p.channel_id ? { ...c, is_alive: p.is_alive! } : c)),
          );
          setSelectedChannel((prev) =>
            prev && prev.id === p.channel_id ? { ...prev, is_alive: p.is_alive! } : prev,
          );
        }
      }
      fetchSubpageCounts();
      fetchChannels({ silent: true });
    });
    return unsub;
  }, [fetchChannels]);

  // Sync selectedChannel with store
  useEffect(() => {
    if (selectedTvChannelId && channels.length > 0) {
      const match = channels.find((c) => c.id === selectedTvChannelId);
      if (match) {
        setSelectedChannel(match);
        if (match.youtube_live_url && (!match.stream_url || match.stream_url.includes('youtube'))) {
          setPlaybackMethod('youtube');
        } else {
          setPlaybackMethod('hls');
        }
      }
    }
  }, [selectedTvChannelId, channels]);

  useEffect(() => {
    if (selectedChannel) {
      setActiveTvStream(selectedChannel);
      if (selectedChannel.id !== selectedTvChannelId) {
        setSelectedTvChannelId(selectedChannel.id);
      }
    }
  }, [selectedChannel, selectedTvChannelId, setActiveTvStream, setSelectedTvChannelId]);

  const selectedChannelRef = useRef<TvChannel | null>(selectedChannel);
  selectedChannelRef.current = selectedChannel;

  // Handle stream loading (HLS with Proxy fallback)
  // Keyed ONLY on stream identity/URLs so live health/favorite metadata updates NEVER remount active stream
  useEffect(() => {
    const activeChannel = selectedChannelRef.current;
    if (!activeChannel || !isTvViewOpen) return;

    setStreamError(null);
    setProbeResult(null);

    // Destroy existing Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (playbackMethod !== 'hls' || !videoRef.current) return;

    const video = videoRef.current;
    const rawStreamUrl = activeChannel.stream_url;
    if (!rawStreamUrl) {
      if (activeChannel.youtube_live_url) {
        setPlaybackMethod('youtube');
      } else {
        setStreamError('No streaming URL configured for this broadcast feed.');
      }
      return;
    }

    // Proxy HLS stream through backend to avoid CORS and mixed content
    const streamUrl = rawStreamUrl.startsWith('http')
      ? `/api/tv/proxy?url=${encodeURIComponent(rawStreamUrl)}`
      : rawStreamUrl;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 9000,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = isMuted;
        video.volume = volume;
        video.play().catch(() => {
          // Autoplay blocked by browser policy without user gesture
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn('[HLS] Fatal stream error:', data.type, data.details);
          if (selectedChannelRef.current?.youtube_live_url) {
            setStreamError('HLS signal unreachable. Official YouTube Live broadcast available.');
          } else {
            setStreamError('Broadcast stream offline or restricted by upstream CDN policy.');
          }
          hls.destroy();
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.muted = isMuted;
      video.volume = volume;
      video.play().catch(() => {});
    } else {
      setStreamError('HLS playback is not supported in this browser engine.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [
    selectedChannel?.id,
    selectedChannel?.stream_url,
    selectedChannel?.youtube_live_url,
    isTvViewOpen,
    playbackMethod,
  ]);

  // Audio Mute toggle handler with state persistence
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('tv_muted', String(next));
        }
      } catch {}
      if (videoRef.current) {
        videoRef.current.muted = next;
      }
      return next;
    });
  }, []);

  // Volume slider handler
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tv_volume', String(newVol));
      }
    } catch {}
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      if (newVol > 0 && isMuted) {
        setIsMuted(false);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('tv_muted', 'false');
          }
        } catch {}
        videoRef.current.muted = false;
      }
    }
  };

  // Copy Stream URL
  const handleCopyUrl = () => {
    if (!selectedChannel) return;
    const url = selectedChannel.stream_url || selectedChannel.youtube_live_url || '';
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      toast.success('Stream URL copied to clipboard');
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  // Perform live stream health probe
  const handleHealthProbe = async () => {
    if (!selectedChannel || isProbing) return;
    setIsProbing(true);
    try {
      const res = await fetch(`/api/tv/channels/${selectedChannel.id}/health-check`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setProbeResult({ isAlive: data.is_alive, latencyMs: data.latency_ms });
        setChannels((prev) =>
          prev.map((c) => (c.id === selectedChannel.id ? { ...c, is_alive: data.is_alive } : c)),
        );
        setSelectedChannel((prev) => (prev ? { ...prev, is_alive: data.is_alive } : null));
        if (data.is_alive) {
          toast.success(`Signal online: ${data.latency_ms}ms latency (${data.method || 'verified'})`);
        } else {
          toast.error(data.detail || 'Stream unreachable');
        }
        fetchSubpageCounts();
      }
    } catch (err) {
      console.error('Health probe failed:', err);
    } finally {
      setIsProbing(false);
    }
  };

  // Toggle fullscreen
  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        videoRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  // Toggle Picture-in-Picture / Mini-Player (S4)
  const handleTogglePip = async () => {
    if (selectedChannel) {
      setActiveTvStream(selectedChannel);
      setTvMiniPlayerOpen(true);
      setTvViewOpen(false);
      toast.success(`Docked ${selectedChannel.name} to Mini-Player`);
      return;
    }
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err: any) {
        toast.error('Picture-in-Picture error: ' + err.message);
      }
    }
  };

  const handleCloseDesk = () => {
    if (selectedChannel && !streamError) {
      setActiveTvStream(selectedChannel);
      setTvMiniPlayerOpen(true);
    }
    setTvViewOpen(false);
  };

  // Filter channels list
  const effectiveIncludeDead = includeDead || subpage === 'faulty' || subpage === 'stopped';
  const filteredChannels = filterChannels(channels, activeShelf, searchQuery, effectiveIncludeDead);
  const healthScore = selectedChannel
    ? calculateHealthRating(selectedChannel.is_alive, probeResult?.latencyMs)
    : 0;

  // Skip to next channel
  const handleSkipNext = () => {
    if (filteredChannels.length === 0) return;
    const currentIndex = filteredChannels.findIndex((c) => c.id === selectedChannel?.id);
    const nextIndex = (currentIndex + 1) % filteredChannels.length;
    const next = filteredChannels[nextIndex];
    if (next) {
      setSelectedChannel(next);
      setSelectedTvChannelId(next.id);
    }
  };

  // Open in VLC with generated M3U playlist file + vlc:// scheme (PRD C Category 5B §6)
  const handleOpenVlc = () => {
    if (!selectedChannel) return;
    const rawUrl = selectedChannel.stream_url || selectedChannel.youtube_live_url || '';
    const streamUrl = rawUrl.startsWith('http')
      ? `${window.location.origin}/api/tv/proxy?url=${encodeURIComponent(rawUrl)}`
      : rawUrl;

    // Generate .m3u playlist download
    const m3uContent = `#EXTM3U\n#EXTINF:-1,${selectedChannel.name} [${selectedChannel.country || 'Global'}]\n${streamUrl}\n`;
    const blob = new Blob([m3uContent], { type: 'application/x-mpegurl' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${selectedChannel.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    // Also trigger protocol launch
    window.location.href = getVlcUrl(streamUrl);
    toast.success(`Exported VLC playlist for ${selectedChannel.name}`);
  };

  // Report broken link handler (PRD C Category 5B §6)
  const handleReportBroken = () => {
    if (!selectedChannel) return;
    toast.success(`Flagged "${selectedChannel.name}" as broken link for editorial review`);
    setChannels((prev) =>
      prev.map((c) =>
        c.id === selectedChannel.id ? { ...c, status: 'needs my review', is_alive: false } : c,
      ),
    );
    setSelectedChannel((prev) =>
      prev ? { ...prev, status: 'needs my review', is_alive: false } : null,
    );
    fetchSubpageCounts();
  };

  // Delete channel permanently
  const handleDeleteChannel = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently remove this stopped channel?')) return;
    try {
      const res = await fetch(`/api/tv/channels/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Channel removed permanently');
        setChannels((prev) => prev.filter((c) => c.id !== id));
        fetchSubpageCounts();
      }
    } catch {
      toast.error('Failed to delete channel');
    }
  };

  // Save updated URL for stopped / faulty channel
  const handleSaveEditChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel) return;
    try {
      const isYt = editUrlInput.includes('youtube.com') || editUrlInput.includes('youtu.be');
      const payload: any = {
        name: editNameInput.trim() || editingChannel.name,
        stream_url: editUrlInput.trim(),
        youtube_live_url: isYt ? editUrlInput.trim() : null,
      };
      const res = await fetch(`/api/tv/channels/${editingChannel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        toast.success(`Updated "${updated.name}" stream link`);
        setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setSelectedChannel(updated);
        setEditingChannel(null);
        fetchSubpageCounts();
      }
    } catch {
      toast.error('Failed to update channel URL');
    }
  };

  // Toggle channel favorite
  const handleToggleFavorite = async (e: React.MouseEvent, channel: TvChannel) => {
    e.stopPropagation();
    try {
      const nextFav = !channel.is_favorite;
      const res = await fetch(`/api/tv/channels/${channel.id}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: nextFav }),
      });

      if (res.ok) {
        setChannels((prev) =>
          prev.map((c) => (c.id === channel.id ? { ...c, is_favorite: nextFav } : c)),
        );
        if (selectedChannel?.id === channel.id) {
          setSelectedChannel((prev) => (prev ? { ...prev, is_favorite: nextFav } : null));
        }
        toast.success(
          nextFav
            ? `Added ${channel.name} to Favorites`
            : `Removed ${channel.name} from Favorites`,
        );
      }
    } catch (err) {
      console.error('Failed to toggle favorite channel:', err);
    }
  };

  // Keyboard navigation & global shortcuts (PRD C Category 5B §5: key 'm' toggles mute)
  useEffect(() => {
    if (!isTvViewOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (['input', 'textarea'].includes(tag)) return;

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredChannels.length === 0) return;
        const currentIndex = filteredChannels.findIndex((c) => c.id === selectedChannel?.id);
        const nextIndex = (currentIndex + 1) % filteredChannels.length;
        const next = filteredChannels[nextIndex];
        if (next) {
          setSelectedChannel(next);
          setSelectedTvChannelId(next.id);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredChannels.length === 0) return;
        const currentIndex = filteredChannels.findIndex((c) => c.id === selectedChannel?.id);
        const prevIndex = (currentIndex - 1 + filteredChannels.length) % filteredChannels.length;
        const prev = filteredChannels[prevIndex];
        if (prev) {
          setSelectedChannel(prev);
          setSelectedTvChannelId(prev.id);
        }
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFullscreen();
      } else if (e.key === 'Escape') {
        handleCloseDesk();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTvViewOpen, filteredChannels, selectedChannel, handleToggleMute, handleCloseDesk, setSelectedTvChannelId]);

  if (!isTvViewOpen) return null;

  return (
    <div
      id="tv-view-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-view-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-ink/80 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseDesk();
      }}
    >
      <div
        className="w-full max-w-7xl h-[92vh] bg-paper text-ink border-2 border-ink rounded-xs shadow-overlay flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Broadsheet Masthead Header */}
        <header className="p-3.5 sm:p-4 border-b-2 border-ink bg-paper-alt flex flex-col gap-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-ui text-[0.6875rem] font-bold uppercase tracking-widest text-ink-secondary">
                  Live Broadcast Wire &amp; Telecasts · Vol. XCII No. 41
                </span>
                <span className="text-ink-muted text-xs">/</span>
                <span className="font-mono text-xs font-bold text-accent">
                  {channels.filter((c) => c.is_alive).length} Live Signals Available
                </span>
              </div>

              <h2
                id="tv-view-heading"
                className="font-headline text-lg sm:text-xl font-bold tracking-tight text-ink flex items-center gap-2"
              >
                <Tv size={20} className="text-accent" />
                <span>International Television &amp; Nature Wire</span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-close-tv-view"
                type="button"
                onClick={handleCloseDesk}
                className="p-1.5 border border-paper-border hover:border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs transition-colors shrink-0"
                title="Close TV Desk (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Subpages Navigation Tabs (Health Truth: LIVE / FAULTY FEEDS / STOPPED LINKS) */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-paper-border">
            <button
              type="button"
              id="tab-subpage-live"
              onClick={() => setSubpage('live')}
              className={`px-3 py-1 font-ui text-xs font-bold uppercase tracking-wider rounded-xs border transition-colors flex items-center gap-1.5 ${
                subpage === 'live'
                  ? 'border-ink bg-paper text-ink shadow-2xs font-extrabold'
                  : 'border-transparent text-ink-secondary hover:text-ink hover:border-paper-border'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-positive" />
              <span>LIVE</span>
              <span className="font-mono text-[10px] bg-paper-border/60 px-1 py-0.2 rounded-2xs">
                {subpageCounts.live}
              </span>
            </button>

            <button
              type="button"
              id="tab-subpage-faulty"
              onClick={() => setSubpage('faulty')}
              className={`px-3 py-1 font-ui text-xs font-bold uppercase tracking-wider rounded-xs border transition-colors flex items-center gap-1.5 ${
                subpage === 'faulty'
                  ? 'border-ink bg-paper text-amber-700 dark:text-amber-400 shadow-2xs font-extrabold'
                  : 'border-transparent text-ink-secondary hover:text-ink hover:border-paper-border'
              }`}
            >
              <AlertTriangle size={12} className="text-amber-600" />
              <span>FAULTY FEEDS</span>
              <span className="font-mono text-[10px] bg-paper-border/60 px-1 py-0.2 rounded-2xs">
                {subpageCounts.faulty}
              </span>
            </button>

            <button
              type="button"
              id="tab-subpage-stopped"
              onClick={() => setSubpage('stopped')}
              className={`px-3 py-1 font-ui text-xs font-bold uppercase tracking-wider rounded-xs border transition-colors flex items-center gap-1.5 ${
                subpage === 'stopped'
                  ? 'border-ink bg-paper text-accent shadow-2xs font-extrabold'
                  : 'border-transparent text-ink-secondary hover:text-ink hover:border-paper-border'
              }`}
            >
              <Radio size={12} className="text-accent" />
              <span>STOPPED LINKS</span>
              <span className="font-mono text-[10px] bg-paper-border/60 px-1 py-0.2 rounded-2xs">
                {subpageCounts.stopped}
              </span>
            </button>
          </div>
        </header>

        {/* 2. Main Content Resizable Split View (PRD C Category 5B §3) */}
        <PanelGroup direction="horizontal" className="flex-1 min-h-0 min-w-0 bg-paper">
          {/* Left Column: Video Broadcast Frame (65% default) */}
          <Panel defaultSize={65} minSize={40} className="flex flex-col min-w-0 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
            {/* Broadsheet Video Monitor (True 16:9 Aspect Ratio) */}
            <div className="w-full aspect-video max-h-[calc(100vh-280px)] bg-black border-2 border-ink rounded-xs overflow-hidden relative shadow-md flex items-center justify-center mx-auto">
              {playbackMethod === 'youtube' && selectedChannel?.youtube_live_url ? (
                <iframe
                  id="tv-youtube-embed-frame"
                  src={getYouTubeEmbedUrl(selectedChannel.youtube_live_url)}
                  title={selectedChannel.name}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  playsInline
                  autoPlay
                  muted={isMuted}
                />
              )}

              {/* Top Monitor Header Overlay */}
              {selectedChannel && (
                <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-none text-white z-10">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        selectedChannel.is_alive ? 'bg-positive animate-pulse' : 'bg-accent'
                      }`}
                    />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">
                      [{playbackMethod === 'youtube' ? 'YOUTUBE' : 'HLS PROXY'}] {selectedChannel.name}
                    </span>
                  </div>
                  <span className="font-mono text-[0.6875rem] text-zinc-300">
                    {selectedChannel.country_code ? `${selectedChannel.country_code} · ` : ''}
                    {selectedChannel.country || 'Global'} · {selectedChannel.category || 'General'}
                  </span>
                </div>
              )}

              {/* Autoplay Muted Overlay Hint Pill (PRD C Category 5B §5) */}
              {isMuted && !streamError && (
                <button
                  type="button"
                  id="btn-unmute-overlay-hint"
                  onClick={handleToggleMute}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 bg-ink/90 text-paper border border-paper-border rounded-full font-ui text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg hover:bg-accent transition-colors cursor-pointer animate-pulse"
                  title="Click to unmute broadcast audio or press 'm'"
                >
                  <VolumeX size={14} />
                  <span>Click here or press &apos;m&apos; to unmute audio</span>
                </button>
              )}

              {/* Stream Error / Offline Overlay (No Stray Shapes, Clear Broadsheet Actions) */}
              {(streamError || (selectedChannel && !selectedChannel.is_alive && playbackMethod === 'hls')) && (
                <div
                  id="tv-stream-offline-overlay"
                  className="absolute inset-0 bg-paper/95 text-ink flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-3 border-2 border-ink z-20 overflow-y-auto"
                >
                  <div className="p-2.5 border-2 border-accent bg-accent/10 rounded-xs shrink-0">
                    <Radio size={28} className="text-accent" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline text-base sm:text-lg font-bold text-accent">
                      Broadcast Signal Offline
                    </h3>
                    <p className="font-body text-xs text-ink-secondary max-w-md">
                      {streamError ||
                        'The selected broadcast feed is unreachable or restricted by upstream CDN policy.'}
                    </p>
                  </div>

                  {/* Fallback Action Buttons (PRD C Category 5B §6) */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {selectedChannel?.youtube_live_url && playbackMethod !== 'youtube' && (
                      <button
                        type="button"
                        id="btn-fallback-youtube"
                        onClick={() => {
                          setPlaybackMethod('youtube');
                          setStreamError(null);
                        }}
                        className="px-3 py-1.5 border border-accent bg-accent text-paper font-ui font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-accent-dark inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Youtube size={13} />
                        <span>Try YouTube</span>
                      </button>
                    )}
                    <button
                      type="button"
                      id="btn-vlc-download"
                      onClick={handleOpenVlc}
                      className="px-3 py-1.5 border border-paper-border hover:border-ink bg-paper text-ink font-ui font-bold text-xs uppercase tracking-wider rounded-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink size={12} />
                      <span>Open in VLC</span>
                    </button>
                    <button
                      type="button"
                      id="btn-skip-next-channel"
                      onClick={handleSkipNext}
                      className="px-3 py-1.5 border border-paper-border hover:border-ink bg-paper text-ink font-ui font-bold text-xs uppercase tracking-wider rounded-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <SkipForward size={12} />
                      <span>Skip to Next</span>
                    </button>
                    <button
                      type="button"
                      id="btn-retry-signal"
                      onClick={() => {
                        setStreamError(null);
                        handleHealthProbe();
                      }}
                      className="px-3 py-1.5 border border-ink bg-paper text-ink font-ui font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-ink hover:text-paper inline-flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw size={12} />
                      <span>Retry Signal</span>
                    </button>
                    <button
                      type="button"
                      id="btn-report-broken"
                      onClick={handleReportBroken}
                      className="px-3 py-1.5 border border-red-600/40 hover:border-red-600 text-red-700 bg-red-500/10 font-ui font-bold text-xs uppercase tracking-wider rounded-xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <AlertTriangle size={12} />
                      <span>Report Broken Link</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Video Controls & Stream Health Bar */}
            {selectedChannel && (
              <div className="mt-3.5 p-3 border-2 border-ink bg-paper-alt rounded-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline text-base font-bold text-ink">
                      {selectedChannel.name}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, selectedChannel)}
                      className="text-accent hover:scale-110 transition-transform"
                      title={
                        selectedChannel.is_favorite ? 'Remove Favorite' : 'Save to Favorites'
                      }
                    >
                      <Heart
                        size={15}
                        fill={selectedChannel.is_favorite ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 font-mono text-[0.6875rem] text-ink-secondary">
                    <span>
                      Stream Health: <strong>{renderHealthDots(healthScore)}</strong>
                    </span>
                    {probeResult && (
                      <span className="text-positive font-bold">
                        · Latency: {probeResult.latencyMs}ms
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Multi-Method Playback Switcher */}
                  <div className="flex items-center gap-1 bg-paper border border-paper-border p-0.5 rounded-xs">
                    <button
                      type="button"
                      id="btn-method-hls"
                      onClick={() => setPlaybackMethod('hls')}
                      className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase rounded-xs transition-colors ${
                        playbackMethod === 'hls'
                          ? 'bg-ink text-paper'
                          : 'text-ink-secondary hover:text-ink'
                      }`}
                      title="Stream using native HLS with backend proxy"
                    >
                      HLS Proxy
                    </button>
                    {selectedChannel.youtube_live_url && (
                      <button
                        type="button"
                        id="btn-method-youtube"
                        onClick={() => setPlaybackMethod('youtube')}
                        className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase rounded-xs transition-colors flex items-center gap-1 ${
                          playbackMethod === 'youtube'
                            ? 'bg-accent text-paper'
                            : 'text-ink-secondary hover:text-accent'
                        }`}
                        title="Stream using official YouTube embed"
                      >
                        <Youtube size={11} />
                        <span>YouTube</span>
                      </button>
                    )}
                  </div>

                  {/* Volume Slider & Dedicated Audio Mute Toggle (PRD C Category 5B §5) */}
                  <div className="flex items-center gap-1.5 bg-paper border border-paper-border px-2 py-1 rounded-xs">
                    <button
                      id="btn-tv-mute-toggle"
                      type="button"
                      onClick={handleToggleMute}
                      className="text-ink hover:text-accent transition-colors p-0.5"
                      title={isMuted ? 'Unmute Audio (m)' : 'Mute Audio (m)'}
                    >
                      {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                    <input
                      id="input-tv-volume"
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-16 h-1 accent-ink cursor-pointer bg-paper-border rounded-lg"
                      title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                    />
                    <span className="font-mono text-[9px] text-ink-muted w-7 text-right">
                      {Math.round((isMuted ? 0 : volume) * 100)}%
                    </span>
                  </div>

                  {/* Copy Stream URL */}
                  <button
                    type="button"
                    id="btn-copy-stream-url"
                    onClick={handleCopyUrl}
                    className="p-1.5 border border-paper-border hover:border-ink bg-paper rounded-xs text-ink transition-colors"
                    title="Copy Raw Stream URL"
                  >
                    {copiedUrl ? <Check size={14} className="text-positive" /> : <Copy size={14} />}
                  </button>

                  {/* Probe Health */}
                  <button
                    type="button"
                    onClick={handleHealthProbe}
                    disabled={isProbing}
                    className="px-2.5 py-1 border border-paper-border hover:border-ink bg-paper text-ink font-ui font-semibold text-xs rounded-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Activity size={12} className={isProbing ? 'animate-spin' : ''} />
                    <span>{isProbing ? 'Probing...' : 'Probe'}</span>
                  </button>

                  {/* Picture-in-Picture */}
                  <button
                    type="button"
                    id="btn-tv-pip"
                    onClick={handleTogglePip}
                    className="p-1.5 border border-paper-border hover:border-ink bg-paper rounded-xs text-ink transition-colors"
                    title="Toggle Picture-in-Picture"
                  >
                    <PictureInPicture2 size={15} />
                  </button>

                  {/* Fullscreen */}
                  <button
                    type="button"
                    onClick={handleFullscreen}
                    className="p-1.5 border border-paper-border hover:border-ink bg-paper rounded-xs text-ink transition-colors"
                    title="Fullscreen (f)"
                  >
                    <Maximize size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Top-5 Curated Outlet Banner */}
            {Boolean(selectedChannel?.is_top5) && selectedChannel && (
              <div
                id="top5-channel-banner"
                className="mt-3 p-3 border-2 border-accent/40 bg-paper-alt rounded-xs space-y-1.5 shrink-0"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase bg-accent text-paper px-2 py-0.5 tracking-wider">
                      TOP 5 CURATED OUTLET · #{selectedChannel.rank}
                    </span>
                    <span className="font-mono text-[10px] uppercase border border-amber-600 text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 font-bold">
                      {selectedChannel.status}
                    </span>
                    <span className="font-serif text-xs font-semibold text-ink">
                      {selectedChannel.country}
                    </span>
                  </div>
                  {selectedChannel.website && (
                    <a
                      href={selectedChannel.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] font-bold text-accent hover:underline inline-flex items-center gap-1"
                    >
                      <span>Official Website</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                {selectedChannel.evidence && (
                  <p className="font-serif text-xs text-ink-secondary italic">
                    Ranking Evidence: {selectedChannel.evidence}
                  </p>
                )}
              </div>
            )}

            {/* Quick Channel Scroll Strip with Disambiguated Labels (PRD C Category 5B §4) */}
            <div className="mt-3.5 pt-2.5 border-t border-paper-border shrink-0">
              <div className="font-ui text-[0.625rem] uppercase font-bold text-ink-muted mb-1.5 flex items-center gap-1.5">
                <Compass size={11} />
                <span>Quick Broadcast Switcher:</span>
              </div>
              <div
                data-lenis-prevent="true"
                className="flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 scrollbar-thin"
              >
                {(allChannels.length > 0 ? allChannels : channels).slice(0, 15).map((ch) => {
                  const isSelected = selectedChannel?.id === ch.id;
                  const disambiguatedLabel = `${ch.name} (${ch.country || 'Global'})`;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setSelectedChannel(ch);
                        setSelectedTvChannelId(ch.id);
                      }}
                      className={`font-mono text-xs px-2.5 py-1 border rounded-xs whitespace-nowrap transition-colors shrink-0 ${
                        isSelected
                          ? 'border-ink bg-paper-alt font-bold text-ink shadow-2xs'
                          : 'border-paper-border bg-paper text-ink-secondary hover:border-ink hover:text-ink'
                      }`}
                      title={disambiguatedLabel}
                    >
                      {disambiguatedLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* Resizable Divider Handle */}
          <PanelResizeHandle className="w-1.5 bg-paper-border hover:bg-ink transition-colors cursor-col-resize flex items-center justify-center relative group">
            <div className="w-0.5 h-8 bg-ink-muted group-hover:bg-paper rounded-full" />
          </PanelResizeHandle>

          {/* Right Column: Channels Shelf & Directory (35% default) */}
          <Panel defaultSize={35} minSize={25} className="flex flex-col min-w-0 min-h-0 bg-paper-alt border-l border-paper-border">
            {/* Shelf Filter Tabs */}
            <div className="p-3 border-b border-paper-border space-y-2.5 bg-paper shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-ui text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                  Channel Directory
                </span>
                <button
                  type="button"
                  id="btn-tv-add-youtube"
                  onClick={() => setIsAddYoutubeOpen(true)}
                  className="px-2 py-0.5 border border-accent bg-accent/10 hover:bg-accent text-accent hover:text-paper font-ui font-bold text-[10px] uppercase tracking-wider rounded-xs inline-flex items-center gap-1 transition-colors"
                  title="Add YouTube live broadcast by URL or @handle"
                >
                  <Youtube size={12} />
                  <span>+ Add YouTube</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter channels..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-ui text-xs text-ink placeholder:text-ink-muted focus:outline-none"
                />
              </div>

              {/* Shelf Tabs */}
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'top5', label: '★ Top 5' },
                  { id: 'india', label: 'India' },
                  { id: 'usa', label: 'USA' },
                  { id: 'china', label: 'China' },
                  { id: 'japan', label: 'Japan' },
                  { id: 'australia', label: 'Australia' },
                  { id: 'animals', label: 'Wildlife' },
                  { id: 'favorites', label: 'Favorites' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    id={`btn-tv-shelf-${tab.id}`}
                    onClick={() => setActiveShelf(tab.id as TvShelf)}
                    className={`px-2 py-0.5 text-center font-ui text-[10px] font-bold uppercase tracking-wider rounded-xs border transition-colors ${
                      activeShelf === tab.id
                        ? 'border-ink bg-paper text-ink shadow-2xs'
                        : 'border-transparent text-ink-muted hover:text-ink hover:border-paper-border'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Include Dead Streams */}
              {subpage === 'live' && (
                <label className="flex items-center gap-1.5 text-[0.6875rem] font-ui text-ink-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDead}
                    onChange={(e) => setIncludeDead(e.target.checked)}
                    className="w-3 h-3 accent-ink cursor-pointer"
                  />
                  <span>Show unavailable streams</span>
                </label>
              )}
            </div>

            {/* Channels Scroll List (Never Cut Off, Full Multiline Titles with Tooltips) */}
            <div
              data-lenis-prevent="true"
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1.5"
            >
              {filteredChannels.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Tv size={28} className="text-ink-muted mx-auto" />
                  <div className="font-headline text-sm font-bold text-ink">
                    No Channels Available
                  </div>
                  <div className="font-body text-xs text-ink-secondary">
                    No broadcast feeds found for the selected shelf filter.
                  </div>
                </div>
              ) : (
                filteredChannels.map((ch) => {
                  const isSelected = selectedChannel?.id === ch.id;
                  const itemHealth = calculateHealthRating(ch.is_alive);

                  return (
                    <div
                      key={ch.id}
                      data-channel-slug={ch.slug || `channel-${ch.id}`}
                      onClick={() => {
                        setSelectedChannel(ch);
                        setSelectedTvChannelId(ch.id);
                      }}
                      className={`tv-channel-item p-2.5 border rounded-xs transition-all flex items-center justify-between gap-2.5 cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'border-ink bg-paper font-semibold shadow-xs'
                          : ch.is_alive
                            ? 'border-paper-border hover:border-ink bg-paper hover:bg-paper-alt'
                            : 'border-paper-border/60 bg-paper-alt/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Country Flag / Logo */}
                        <div className="w-6 h-6 rounded-xs bg-paper-border/30 flex items-center justify-center shrink-0 overflow-hidden text-xs">
                          {ch.logo_url ? (
                            <img
                              src={ch.logo_url}
                              alt={ch.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{getCountryFlag(ch.country_code)}</span>
                          )}
                        </div>

                        {/* Channel Metadata */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4
                              className="font-headline text-xs font-bold text-ink leading-tight line-clamp-2"
                              title={ch.name}
                            >
                              {ch.name}
                            </h4>
                            {Boolean(ch.is_top5) && (
                              <span className="font-mono text-[8px] font-bold uppercase bg-accent text-paper px-1 py-0.2 shrink-0">
                                TOP 5 #{ch.rank}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[0.625rem] text-ink-muted">
                            <span>{ch.country_code ? `${ch.country_code} · ` : ''}{ch.country || 'Global'}</span>
                            <span>·</span>
                            <span className="uppercase text-[9px] font-semibold text-ink-secondary">
                              {ch.youtube_live_url && (!ch.stream_url || ch.stream_url.includes('youtube')) ? 'YOUTUBE' : 'HLS PROXY'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Health Status Word Badge: LIVE, SLOW, OFFLINE (PRD C Category 5B §3) */}
                        <span
                          className={`font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border rounded-xs shrink-0 ${
                            !ch.is_alive
                              ? 'border-red-600/40 bg-red-500/10 text-red-800 dark:text-red-400'
                              : itemHealth <= 2
                              ? 'border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-400'
                              : 'border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400'
                          }`}
                        >
                          {!ch.is_alive ? 'OFFLINE' : itemHealth <= 2 ? 'SLOW' : 'LIVE'}
                        </span>

                        {/* Subpage Specific Actions */}
                        {subpage === 'faulty' && (
                          <button
                            type="button"
                            id={`btn-retry-channel-${ch.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChannel(ch);
                              setSelectedTvChannelId(ch.id);
                              handleHealthProbe();
                            }}
                            className="px-2 py-0.5 border border-amber-600/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-ui text-[10px] font-bold rounded-xs flex items-center gap-1"
                            title="Test & Retry stream signal"
                          >
                            <RotateCcw size={10} />
                            <span>Retry</span>
                          </button>
                        )}

                        {subpage === 'stopped' && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              id={`btn-edit-channel-${ch.id}`}
                              onClick={() => {
                                setEditingChannel(ch);
                                setEditNameInput(ch.name);
                                setEditUrlInput(ch.stream_url || ch.youtube_live_url || '');
                              }}
                              className="p-1 border border-paper-border hover:border-ink rounded-xs text-ink-secondary hover:text-ink"
                              title="Edit Stream URL"
                            >
                              <Edit3 size={11} />
                            </button>
                            <button
                              type="button"
                              id={`btn-delete-channel-${ch.id}`}
                              onClick={() => handleDeleteChannel(ch.id)}
                              className="p-1 border border-red-600/40 hover:border-red-600 text-red-700 hover:bg-red-500/10 rounded-xs"
                              title="Remove Permanently"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, ch)}
                          className="text-accent hover:scale-110 transition-transform p-1 shrink-0"
                          title={ch.is_favorite ? 'Remove Favorite' : 'Save to Favorites'}
                        >
                          <Heart
                            size={13}
                            fill={ch.is_favorite ? 'currentColor' : 'none'}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Panel>
        </PanelGroup>

        {/* 3. Footer Status Bar (Fixed Outside Scroll Container, Never Overlaps Content) */}
        <footer className="p-2.5 sm:p-3 border-t-2 border-ink bg-paper-alt flex flex-wrap items-center justify-between gap-3 text-xs font-ui text-ink-secondary shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[0.6875rem]">IPTV Engine:</span>
            <span>HLS.js v1.5+ · Master/Child Rewrite · Port 3001 Proxy · Desktop VLC</span>
          </div>
          <span className="font-mono text-[0.625rem] text-ink-muted">
            Press ESC to return to desk · Press M to mute/unmute audio
          </span>
        </footer>
      </div>

      {/* Add Custom YouTube Stream Modal */}
      <AddYouTubeChannelModal
        isOpen={isAddYoutubeOpen}
        onClose={() => setIsAddYoutubeOpen(false)}
        onChannelAdded={(newChannel) => {
          setChannels((prev) => [newChannel, ...prev]);
          setSelectedChannel(newChannel);
          setSelectedTvChannelId(newChannel.id);
          if (newChannel.youtube_live_url) {
            setPlaybackMethod('youtube');
          }
          fetchSubpageCounts();
        }}
      />

      {/* Edit Channel URL Modal */}
      {editingChannel && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-2xs"
          onClick={() => setEditingChannel(null)}
        >
          <div
            className="w-full max-w-md bg-paper text-ink border-2 border-ink rounded-xs p-5 shadow-overlay space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-base font-bold text-ink">
                Edit Stream URL
              </h3>
              <button
                type="button"
                onClick={() => setEditingChannel(null)}
                className="p-1 hover:bg-paper-border rounded-xs"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditChannel} className="space-y-3">
              <div>
                <label className="font-ui text-xs font-semibold text-ink-secondary block mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-ui text-xs text-ink"
                  required
                />
              </div>

              <div>
                <label className="font-ui text-xs font-semibold text-ink-secondary block mb-1">
                  Stream URL (HLS .m3u8 or YouTube link)
                </label>
                <input
                  type="text"
                  value={editUrlInput}
                  onChange={(e) => setEditUrlInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-mono text-xs text-ink"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-paper-border">
                <button
                  type="button"
                  onClick={() => setEditingChannel(null)}
                  className="px-3 py-1.5 border border-paper-border text-ink-secondary font-ui text-xs font-semibold rounded-xs hover:border-ink hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 border border-ink bg-ink text-paper font-ui text-xs font-bold rounded-xs hover:bg-ink/90"
                >
                  Save Stream URL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
