/**
 * frontend/src/components/tv/TVView.tsx
 * Live IPTV Channel Browser & HLS Video Player (Phase 11).
 * Features Animal & Discovery shelf, stream health probing, VLC fallback, and favorites.
 */
import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { useAppStore } from '../../store/useAppStore';
import type { TvChannel } from '../../types';
import { Tv, Heart, Activity, ExternalLink, Maximize, Search, ArrowLeft } from 'lucide-react';
import './TVView.css';

export const TVView: React.FC = () => {
  const isTvViewOpen = useAppStore((s) => s.isTvViewOpen);
  const setTvViewOpen = useAppStore((s) => s.setTvViewOpen);
  const selectedTvChannelId = useAppStore((s) => s.selectedTvChannelId);
  const setSelectedTvChannelId = useAppStore((s) => s.setSelectedTvChannelId);

  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [activeShelf, setActiveShelf] = useState<'all' | 'animals' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeDead, setIncludeDead] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<TvChannel | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{ isAlive: boolean; latencyMs: number } | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Fetch channels list based on active filters
  const fetchChannels = async () => {
    try {
      const params = new URLSearchParams();
      if (includeDead) params.set('include_dead', 'true');
      if (activeShelf === 'animals') params.set('category', 'animals');
      if (activeShelf === 'favorites') params.set('favorites_only', 'true');
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/tv/channels?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items: TvChannel[] = data.items || [];
        setChannels(items);

        // Auto select first channel if none selected
        if (!selectedChannel && items.length > 0) {
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
    }
  }, [isTvViewOpen, activeShelf, includeDead, searchQuery]);

  // Sync selectedChannel with store
  useEffect(() => {
    if (selectedTvChannelId && channels.length > 0) {
      const match = channels.find((c) => c.id === selectedTvChannelId);
      if (match) setSelectedChannel(match);
    }
  }, [selectedTvChannelId, channels]);

  // Handle HLS stream loading
  useEffect(() => {
    if (!selectedChannel || !videoRef.current || !isTvViewOpen) return;

    const video = videoRef.current;
    setStreamError(null);
    setProbeResult(null);

    // Destroy existing Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = selectedChannel.stream_url;

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
          // Auto-play was prevented by browser policy (user gesture required)
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn('[HLS] Fatal stream error:', data.type);
          setStreamError('Live broadcast feed offline or restricted by CORS policy.');
          hls.destroy();
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple Safari HLS playback
      video.src = streamUrl;
      video.play().catch(() => {});
    } else {
      setStreamError('HLS playback is not supported by your browser engine.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedChannel, isTvViewOpen]);

  // Keyboard navigation: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTvViewOpen) {
        setTvViewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTvViewOpen, setTvViewOpen]);

  // Toggle channel favorite status (P11-08)
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
      }
    } catch (err) {
      console.error('Failed to toggle favorite channel:', err);
    }
  };

  // Perform live stream health check (P11-04)
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
        // Update in channels list
        setChannels((prev) =>
          prev.map((c) => (c.id === selectedChannel.id ? { ...c, is_alive: data.is_alive } : c)),
        );
        setSelectedChannel((prev) => (prev ? { ...prev, is_alive: data.is_alive } : null));
      }
    } catch (err) {
      console.error('Health probe failed:', err);
    } finally {
      setIsProbing(false);
    }
  };

  // Fullscreen video toggle
  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        videoRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  if (!isTvViewOpen) return null;

  return (
    <div
      className="tv-view-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tv-view-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) setTvViewOpen(false);
      }}
    >
      <div className="tv-view-modal">
        {/* Header */}
        <header className="tv-view-header">
          <div className="tv-view-header-left">
            <h2 id="tv-view-heading" className="tv-view-title">
              <Tv size={22} color="var(--accent-primary)" />
              <span>International Wire Television &amp; Live Feeds</span>
            </h2>
            <div className="tv-view-subtitle">
              IPTV broadcast streams &bull; Wildlife safaris &bull; Documentary telecasts
            </div>
          </div>

          <button
            id="btn-close-tv-view"
            className="tv-view-close-btn"
            onClick={() => setTvViewOpen(false)}
            aria-label="Back to News Desk"
          >
            <ArrowLeft size={16} />
            <span>Back to News Desk</span>
          </button>
        </header>

        {/* Main Body */}
        <div className="tv-view-main">
          {/* Sidebar Channels List */}
          <aside className="tv-view-sidebar">
            <div className="tv-sidebar-controls">
              {/* Search input */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px' }} />
                <input
                  type="text"
                  className="tv-search-input"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Filter channels &amp; streams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Shelf Tabs (P11-07, P11-08) */}
              <div className="tv-shelves-row">
                <button
                  className={`tv-shelf-btn ${activeShelf === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveShelf('all')}
                >
                  All Feeds
                </button>
                <button
                  className={`tv-shelf-btn animal ${activeShelf === 'animals' ? 'active' : ''}`}
                  onClick={() => setActiveShelf('animals')}
                  title="Animal & Discovery Safari Shelf"
                >
                  🦁 Animal &amp; Safari
                </button>
                <button
                  className={`tv-shelf-btn ${activeShelf === 'favorites' ? 'active' : ''}`}
                  onClick={() => setActiveShelf('favorites')}
                >
                  ♥ Favorites
                </button>
              </div>

              {/* Show Dead Streams Toggle (P11-10) */}
              <label className="tv-dead-toggle-label">
                <input
                  type="checkbox"
                  checked={includeDead}
                  onChange={(e) => setIncludeDead(e.target.checked)}
                />
                <span>Show offline streams</span>
              </label>
            </div>

            {/* Channels Scroll List */}
            <div className="tv-channels-list">
              {channels.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
                  No channels found matching the filter criteria.
                </div>
              ) : (
                channels.map((ch) => {
                  const isSelected = selectedChannel?.id === ch.id;
                  return (
                    <div
                      key={ch.id}
                      className={`tv-channel-item ${isSelected ? 'selected' : ''} ${!ch.is_alive ? 'dead' : ''}`}
                      onClick={() => {
                        setSelectedChannel(ch);
                        setSelectedTvChannelId(ch.id);
                      }}
                    >
                      <div className="tv-channel-left">
                        <span className={`tv-channel-status-dot ${ch.is_alive ? 'alive' : 'dead'}`} />
                        <div className="tv-channel-info">
                          <span className="tv-channel-name">{ch.name}</span>
                          <div className="tv-channel-meta">
                            <span>{ch.country || 'Global'}</span>
                            <span>&bull;</span>
                            <span style={{ textTransform: 'capitalize' }}>{ch.category || 'General'}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        className={`tv-channel-fav-btn ${ch.is_favorite ? 'is-fav' : ''}`}
                        onClick={(e) => handleToggleFavorite(e, ch)}
                        title={ch.is_favorite ? 'Remove Favorite' : 'Save to Favorites'}
                      >
                        <Heart size={14} fill={ch.is_favorite ? '#ef4444' : 'none'} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Video Player Right Pane (P11-06) */}
          <main className="tv-view-player-pane">
            <div className="tv-player-wrapper">
              <video
                ref={videoRef}
                className="tv-video-element"
                controls
                playsInline
                muted={false}
              />

              {/* Stream Error / Offline Overlay */}
              {(streamError || (selectedChannel && !selectedChannel.is_alive)) && (
                <div className="tv-player-offline-state" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)' }}>
                  <Tv size={42} color="#ef4444" />
                  <div className="tv-empty-title">Stream Feed Offline or Restricted</div>
                  <div className="tv-empty-desc">
                    {streamError || 'The selected IPTV broadcast is currently unreachable or timed out during signal acquisition.'}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button className="tv-action-btn" onClick={handleHealthProbe}>
                      Probe Signal Again
                    </button>
                    {selectedChannel && (
                      <a
                        className="tv-action-btn vlc"
                        href={`vlc://${selectedChannel.stream_url}`}
                        title="Open Stream in VLC Media Player"
                      >
                        <ExternalLink size={13} />
                        <span>Open in External VLC</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Video Controls & Metadata Bar */}
            {selectedChannel && (
              <footer className="tv-player-controls-bar">
                <div className="tv-player-channel-meta">
                  <span className={`tv-channel-status-dot ${selectedChannel.is_alive ? 'alive' : 'dead'}`} />
                  <div>
                    <h3 className="tv-player-channel-title">{selectedChannel.name}</h3>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', gap: '8px' }}>
                      <span>{selectedChannel.country || 'International'}</span>
                      <span>&bull;</span>
                      <span style={{ textTransform: 'capitalize' }}>{selectedChannel.category || 'Wire Live'}</span>
                      {probeResult && (
                        <span>
                          &bull; Latency: <strong style={{ color: probeResult.isAlive ? '#22c55e' : '#ef4444' }}>{probeResult.latencyMs}ms</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="tv-player-actions">
                  {/* Health Check Probe (P11-04) */}
                  <button
                    className="tv-action-btn"
                    onClick={handleHealthProbe}
                    disabled={isProbing}
                    title="Probe Live Signal Latency"
                  >
                    <Activity size={13} />
                    <span>{isProbing ? 'Probing...' : 'Probe Signal'}</span>
                  </button>

                  {/* Open in VLC Fallback (P11-09) */}
                  <a
                    className="tv-action-btn vlc"
                    href={`vlc://${selectedChannel.stream_url}`}
                    title="Open Stream in Desktop VLC Media Player"
                  >
                    <ExternalLink size={13} />
                    <span>Open in VLC</span>
                  </a>

                  {/* Fullscreen Button */}
                  <button
                    className="tv-action-btn"
                    onClick={handleFullscreen}
                    title="Fullscreen Player"
                  >
                    <Maximize size={13} />
                  </button>
                </div>
              </footer>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
