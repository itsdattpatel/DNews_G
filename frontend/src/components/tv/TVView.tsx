/**
 * frontend/src/components/tv/TVView.tsx
 * Screen (h): Live IPTV Television & Wildlife Stream Desk (Step 11).
 * Broadsheet broadcast frame, HLS video player, 5-dot stream health indicators,
 * Nature & Safari shelf, favorites persistence, VLC fallback links, and horizontal quick strip.
 */
import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { AddYouTubeChannelModal } from './AddYouTubeChannelModal';

export const TVView: React.FC = () => {
  const isTvViewOpen = useAppStore((s) => s.isTvViewOpen);
  const setTvViewOpen = useAppStore((s) => s.setTvViewOpen);
  const selectedTvChannelId = useAppStore((s) => s.selectedTvChannelId);
  const setSelectedTvChannelId = useAppStore((s) => s.setSelectedTvChannelId);

  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [activeShelf, setActiveShelf] = useState<TvShelf>('all');
  const [subpage, setSubpage] = useState<'live' | 'faulty' | 'stopped'>('live');
  const [subpageCounts, setSubpageCounts] = useState({ live: 0, faulty: 0, stopped: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [includeDead, setIncludeDead] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<TvChannel | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{ isAlive: boolean; latencyMs: number } | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackMethod, setPlaybackMethod] = useState<'hls' | 'youtube' | 'vlc'>('hls');
  const [isAddYoutubeOpen, setIsAddYoutubeOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [editingChannel, setEditingChannel] = useState<TvChannel | null>(null);
  const [editUrlInput, setEditUrlInput] = useState('');
  const [editNameInput, setEditNameInput] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Fetch subpages counts
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
  const fetchChannels = async () => {
    try {
      const res = await fetch(`/api/tv/channels?subpage=${subpage}&include_dead=true`);
      if (res.ok) {
        const data = await res.json();
        const items: TvChannel[] = data.items || [];
        setChannels(items);

        // Auto select first channel if current is missing from view
        if (items.length > 0 && (!selectedChannel || !items.some((c) => c.id === selectedChannel.id))) {
          const defaultChannel = items.find((c) => c.is_alive) || items[0]!;
          setSelectedChannel(defaultChannel);
          setSelectedTvChannelId(defaultChannel.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch TV channels:', err);
    }
  };

  useEffect(() => {
    if (isTvViewOpen) {
      fetchChannels();
      fetchSubpageCounts();
    }
  }, [isTvViewOpen, subpage]);

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

  // Handle stream loading (HLS with Proxy fallback)
  useEffect(() => {
    if (!selectedChannel || !isTvViewOpen) return;

    setStreamError(null);
    setProbeResult(null);

    // Destroy existing Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (playbackMethod !== 'hls' || !videoRef.current) return;

    const video = videoRef.current;
    const rawStreamUrl = selectedChannel.stream_url;
    if (!rawStreamUrl) {
      if (selectedChannel.youtube_live_url) {
        setPlaybackMethod('youtube');
      }
      return;
    }

    // Proxy HLS stream through backend to avoid CORS and mixed content (PRD A §6.1)
    const streamUrl = rawStreamUrl.startsWith('http')
      ? `/api/tv/proxy?url=${encodeURIComponent(rawStreamUrl)}`
      : rawStreamUrl;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 8000,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // Browser requires user interaction before autoplay
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn('[HLS] Fatal stream error:', data.type);
          if (selectedChannel.youtube_live_url) {
            setStreamError('HLS signal unreachable. Official YouTube Live broadcast available.');
          } else {
            setStreamError('Live broadcast feed offline or restricted by CORS policy.');
          }
          hls.destroy();
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
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
  }, [selectedChannel, isTvViewOpen, playbackMethod]);

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

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTvViewOpen) {
        setTvViewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTvViewOpen, setTvViewOpen]);

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
          toast.success(`Signal online: ${data.latency_ms}ms latency`);
        } else {
          toast.error('Stream unreachable');
        }
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

  // Toggle audio mute
  const handleToggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  // Volume slider handler
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  // Picture-in-Picture handler (PRD A §7.2)
  const handleTogglePip = async () => {
    if (videoRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err: any) {
        toast.error('Picture-in-Picture error: ' + err.message);
      }
    }
  };

  // Delete channel permanently (PRD A §7.1 Stopped Links)
  const handleDeleteChannel = async (id: number) => {
    if (!window.confirm('Are you sure you want to permanently remove this stopped channel?')) return;
    try {
      const res = await fetch(`/api/tv/channels/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Channel removed permanently');
        setChannels((prev) => prev.filter((c) => c.id !== id));
        fetchSubpageCounts();
      }
    } catch (err: any) {
      toast.error('Failed to delete channel');
    }
  };

  // Save updated URL for stopped / faulty channel (PRD A §7.1 Edit URL)
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
    } catch (err: any) {
      toast.error('Failed to update channel URL');
    }
  };

  // Filter channels list
  const filteredChannels = filterChannels(channels, activeShelf, searchQuery, includeDead);
  const healthScore = selectedChannel
    ? calculateHealthRating(selectedChannel.is_alive, probeResult?.latencyMs)
    : 0;

  // Keyboard navigation: ArrowUp / ArrowDown channel switch & 'f' fullscreen (PRD A §7.2)
  useEffect(() => {
    if (!isTvViewOpen || filteredChannels.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = filteredChannels.findIndex((c) => c.id === selectedChannel?.id);
        const nextIndex = (currentIndex + 1) % filteredChannels.length;
        const next = filteredChannels[nextIndex];
        if (next) {
          setSelectedChannel(next);
          setSelectedTvChannelId(next.id);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTvViewOpen, filteredChannels, selectedChannel]);

  if (!isTvViewOpen) return null;

  return (
    <div
      id="tv-view-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-view-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-7 bg-ink/80 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) setTvViewOpen(false);
      }}
    >
      <div
        className="w-full max-w-6xl h-[90vh] bg-paper text-ink border-2 border-ink rounded-xs shadow-overlay flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Broadsheet Masthead Header */}
        <header className="p-4 sm:p-5 border-b-2 border-ink bg-paper-alt flex flex-col gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                className="font-headline text-xl sm:text-2xl font-bold tracking-tight text-ink flex items-center gap-2"
              >
                <Tv size={22} className="text-accent" />
                <span>International Television &amp; Nature Wire</span>
              </h2>

              <div className="font-ui text-xs text-ink-secondary">
                IPTV broadcast streams · Nature documentary &amp; wildlife tracking · Multi-method player
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-close-tv-view"
                type="button"
                onClick={() => setTvViewOpen(false)}
                className="p-1.5 border border-paper-border hover:border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs transition-colors shrink-0"
                title="Close TV Desk (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Subpages Navigation Tabs (PRD A §7.1: LIVE / FAULTY FEEDS / STOPPED LINKS) */}
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
                {subpageCounts.live || channels.length}
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

        {/* 2. Main Content Split View */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-paper">
          {/* Left Column: Video Broadcast Frame (65%) */}
          <main
            data-lenis-prevent="true"
            className="flex-1 min-h-0 min-w-0 flex flex-col p-4 sm:p-5 overflow-y-auto overscroll-contain border-b lg:border-b-0 lg:border-r-2 border-ink"
          >
            {/* Broadsheet Video Monitor */}
            <div className="w-full aspect-video bg-black border-2 border-ink rounded-xs overflow-hidden relative shadow-md flex items-center justify-center">
              {playbackMethod === 'youtube' && selectedChannel?.youtube_live_url ? (
                <iframe
                  id="tv-youtube-embed-frame"
                  src={selectedChannel.youtube_live_url}
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
                <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-none text-white">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        selectedChannel.is_alive ? 'bg-positive animate-pulse' : 'bg-accent'
                      }`}
                    />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">
                      [{playbackMethod === 'youtube' ? 'YOUTUBE' : 'HLS'}] {selectedChannel.name}
                    </span>
                  </div>
                  <span className="font-mono text-[0.6875rem] text-zinc-300">
                    {selectedChannel.country || 'Global'} · {selectedChannel.category || 'General'}
                  </span>
                </div>
              )}

              {/* Stream Error / Offline Overlay */}
              {(streamError || (selectedChannel && !selectedChannel.is_alive && playbackMethod === 'hls')) && (
                <div
                  id="tv-stream-offline-overlay"
                  className="absolute inset-0 bg-paper/95 text-ink flex flex-col items-center justify-center p-6 text-center space-y-3 border-2 border-ink"
                >
                  <div className="p-3 border-2 border-accent bg-accent/10 rounded-xs">
                    <Radio size={32} className="text-accent" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline text-lg font-bold text-accent">
                      Stream Signal Offline or Restricted
                    </h3>
                    <p className="font-body text-xs text-ink-secondary max-w-sm">
                      {streamError ||
                        'The selected IPTV broadcast is currently unreachable or timed out during signal acquisition.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {selectedChannel?.youtube_live_url && playbackMethod !== 'youtube' && (
                      <button
                        type="button"
                        id="btn-fallback-youtube"
                        onClick={() => {
                          setPlaybackMethod('youtube');
                          setStreamError(null);
                        }}
                        className="px-3.5 py-1.5 border border-accent bg-accent text-paper font-ui font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-accent/90 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Youtube size={13} />
                        <span>Switch to YouTube Live</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleHealthProbe}
                      className="px-3.5 py-1.5 border border-ink bg-paper text-ink font-ui font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-ink hover:text-paper inline-flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw size={12} />
                      <span>Probe Signal</span>
                    </button>
                    {selectedChannel && (
                      <a
                        href={getVlcUrl(selectedChannel.stream_url)}
                        className="px-3.5 py-1.5 border border-paper-border hover:border-ink bg-paper text-ink font-ui font-bold text-xs uppercase tracking-wider rounded-xs inline-flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink size={12} />
                        <span>Open in VLC</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Video Controls & Stream Health Bar */}
            {selectedChannel && (
              <div className="mt-4 p-3.5 border-2 border-ink bg-paper-alt rounded-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="space-y-1">
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

                  <div className="flex flex-wrap items-center gap-2.5 font-mono text-[0.6875rem] text-ink-secondary">
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

                <div className="flex items-center gap-2">
                  {/* Multi-Method Playback Switcher (PRD A §6.1) */}
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

                  {/* Volume Slider & Audio Mute Toggle */}
                  <div className="flex items-center gap-1.5 bg-paper border border-paper-border px-1.5 py-1 rounded-xs">
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className="text-ink hover:text-accent transition-colors"
                      title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                    >
                      {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
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
                    <span className="font-mono text-[9px] text-ink-muted w-6">
                      {Math.round((isMuted ? 0 : volume) * 100)}%
                    </span>
                  </div>

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

                  {/* VLC Protocol Link */}
                  <a
                    href={getVlcUrl(selectedChannel.stream_url)}
                    className="px-2.5 py-1 border border-paper-border hover:border-ink bg-paper text-ink font-ui font-semibold text-xs rounded-xs inline-flex items-center gap-1.5 transition-colors"
                    title="Open Stream in Desktop VLC Media Player"
                  >
                    <ExternalLink size={12} />
                    <span>VLC</span>
                  </a>

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

            {/* Top-5 Curated Outlet Banner (PRD A Category 5) */}
            {selectedChannel?.is_top5 && (
              <div
                id="top5-channel-banner"
                className="mt-3 p-3 border-2 border-accent/40 bg-paper-alt rounded-xs space-y-1.5"
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

            {/* Quick Channel Scroll Strip (PRD §Screen h) */}
            <div className="mt-4 pt-3 border-t border-paper-border">
              <div className="font-ui text-[0.625rem] uppercase font-bold text-ink-muted mb-2 flex items-center gap-1.5">
                <Compass size={11} />
                <span>Quick Broadcast Switcher:</span>
              </div>
              <div
                data-lenis-prevent="true"
                className="flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-1"
              >
                {channels.slice(0, 10).map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(ch);
                      setSelectedTvChannelId(ch.id);
                    }}
                    className={`font-mono text-xs px-2.5 py-1 border rounded-xs whitespace-nowrap transition-colors ${
                      selectedChannel?.id === ch.id
                        ? 'border-ink bg-paper-alt font-bold text-ink shadow-2xs'
                        : 'border-paper-border bg-paper text-ink-secondary hover:border-ink'
                    }`}
                  >
                    {ch.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </main>

          {/* Right Column: Channels Shelf & Directory (35%) */}
          <aside className="w-full lg:w-80 flex flex-col bg-paper-alt shrink-0 overflow-hidden">
            {/* Shelf Filter Tabs */}
            <div className="p-3 border-b border-paper-border space-y-2.5 bg-paper">
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

              {/* Shelf Tabs (PRD A Category 5) */}
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
                    className={`px-2 py-1 text-center font-ui text-[11px] font-bold uppercase tracking-wider rounded-xs border transition-colors ${
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
              <label className="flex items-center gap-1.5 text-[0.6875rem] font-ui text-ink-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDead}
                  onChange={(e) => setIncludeDead(e.target.checked)}
                  className="w-3 h-3 accent-ink cursor-pointer"
                />
                <span>Show unavailable streams</span>
              </label>
            </div>

            {/* Channels Scroll List */}
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
                      className={`tv-channel-item p-3 border rounded-xs transition-all flex items-center justify-between gap-2.5 cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'border-ink bg-paper font-semibold shadow-xs'
                          : ch.is_alive
                            ? 'border-paper-border hover:border-ink bg-paper hover:bg-paper-alt'
                            : 'border-paper-border/60 bg-paper-alt/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Textual Health Badge (PRD A §7.2: LIVE / SLOW / OFFLINE - No bare colored dots) */}
                        {(() => {
                          let healthLabel = 'LIVE';
                          let badgeClass =
                            'border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400';
                          if (!ch.is_alive) {
                            healthLabel = 'OFFLINE';
                            badgeClass =
                              'border-red-600/40 bg-red-500/10 text-red-800 dark:text-red-400';
                          } else if (itemHealth <= 2) {
                            healthLabel = 'SLOW';
                            badgeClass =
                              'border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-400';
                          }

                          return (
                            <span
                              className={`font-mono text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 border rounded-xs shrink-0 ${badgeClass}`}
                            >
                              {healthLabel}
                            </span>
                          );
                        })()}

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-headline text-xs font-bold text-ink truncate leading-tight">
                              {ch.name}
                            </h4>
                            {ch.is_top5 && (
                              <span className="font-mono text-[9px] font-bold uppercase bg-accent text-paper px-1 py-0.2 shrink-0">
                                TOP 5 · #{ch.rank}
                              </span>
                            )}
                            {ch.status === 'needs my review' && (
                              <span className="font-mono text-[8px] uppercase border border-amber-600 text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.2 shrink-0">
                                NEEDS REVIEW
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[0.625rem] text-ink-muted">
                            <span>{ch.country || 'Global'}</span>
                            <span>·</span>
                            <span>{ch.category || 'General'}</span>
                            <span>·</span>
                            <span>{renderHealthDots(itemHealth)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Subpage Specific Actions (PRD A §7.1) */}
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
          </aside>
        </div>

        {/* 3. Footer Status Bar */}
        <footer className="p-3 border-t-2 border-ink bg-paper-alt flex flex-wrap items-center justify-between gap-3 text-xs font-ui text-ink-secondary shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[0.6875rem]">IPTV Engine:</span>
            <span>HLS.js v1.5+ · M3U8 Stream Parsing · Desktop VLC Fallback</span>
          </div>
          <span className="font-mono text-[0.625rem] text-ink-muted">
            Press ESC to return to desk
          </span>
        </footer>
      </div>

      {/* Add Custom YouTube Stream Modal (PRD A §6.2) */}
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

      {/* Edit Channel URL Modal (PRD A §7.1 Edit URL) */}
      {editingChannel && (
        <div
          id="modal-edit-channel-url"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-xs select-none"
          onClick={() => setEditingChannel(null)}
        >
          <form
            onSubmit={handleSaveEditChannel}
            className="w-full max-w-md bg-paper text-ink border-2 border-ink rounded-xs p-5 space-y-4 shadow-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-paper-border pb-2">
              <h3 className="font-headline text-base font-bold text-ink">Edit Channel Link</h3>
              <button
                type="button"
                onClick={() => setEditingChannel(null)}
                className="p-1 border border-paper-border hover:border-ink rounded-xs text-ink-secondary"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary block">
                Channel Name
              </label>
              <input
                type="text"
                value={editNameInput}
                onChange={(e) => setEditNameInput(e.target.value)}
                className="w-full px-3 py-1.5 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-headline text-xs font-bold text-ink focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary block">
                Stream URL / YouTube Embed URL
              </label>
              <input
                type="text"
                value={editUrlInput}
                onChange={(e) => setEditUrlInput(e.target.value)}
                placeholder="https://...m3u8 or https://youtube.com/..."
                className="w-full px-3 py-1.5 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-mono text-xs text-ink focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-paper-border">
              <button
                type="button"
                onClick={() => setEditingChannel(null)}
                className="px-3.5 py-1.5 border border-paper-border hover:border-ink bg-paper text-ink font-ui font-semibold text-xs rounded-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-confirm-save-channel-url"
                className="px-4 py-1.5 border border-accent bg-accent text-paper font-ui font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-accent/90"
              >
                Save &amp; Restore
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TVView;
