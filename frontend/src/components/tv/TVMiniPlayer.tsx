/**
 * frontend/src/components/tv/TVMiniPlayer.tsx
 * Floating Dock Picture-in-Picture TV Mini-Player (PRD C Category 8 / Suggestion S4).
 *
 * Allows background monitoring of live news broadcasts and nature webcams
 * when reading articles, exploring the 3D globe, or browsing The Library.
 * Docked at the bottom-right corner with 16:9 aspect ratio, mute toggle,
 * expand-to-full-desk, and close controls.
 */
import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { useAppStore } from '../../store/useAppStore';
import { getYouTubeEmbedUrl } from './TVView';
import {
  X,
  Maximize2,
  Volume2,
  VolumeX,
  Radio,
} from 'lucide-react';

function getCountryFlag(code?: string | null): string {
  if (!code || code.length !== 2) return '🌐';
  const offset = 127397;
  const chars = [...code.toUpperCase()].map((c) => c.charCodeAt(0) + offset);
  return String.fromCodePoint(...chars);
}

export interface TVMiniPlayerProps {
  forcedOpen?: boolean;
  forcedChannel?: any;
  forcedTvViewOpen?: boolean;
}

export const TVMiniPlayer: React.FC<TVMiniPlayerProps> = ({
  forcedOpen,
  forcedChannel,
  forcedTvViewOpen,
}) => {
  const isMiniOpenStore = useAppStore((s) => s.isTvMiniPlayerOpen);
  const isMiniOpen = forcedOpen !== undefined ? forcedOpen : isMiniOpenStore;
  const setMiniOpen = useAppStore((s) => s.setTvMiniPlayerOpen);

  const storeActiveChannel = useAppStore((s) => s.activeTvStream);
  const activeChannel = forcedChannel !== undefined ? forcedChannel : storeActiveChannel;
  const setActiveTvStream = useAppStore((s) => s.setActiveTvStream);

  const isTvViewOpenStore = useAppStore((s) => s.isTvViewOpen);
  const isTvViewOpen = forcedTvViewOpen !== undefined ? forcedTvViewOpen : isTvViewOpenStore;
  const setTvViewOpen = useAppStore((s) => s.setTvViewOpen);
  const setSelectedTvChannelId = useAppStore((s) => s.setSelectedTvChannelId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isMuted, setIsMuted] = useState(true);

  // If full TV view is open or no active channel, hide mini player
  const shouldRender = isMiniOpen && !!activeChannel && !isTvViewOpen;

  const rawUrl = activeChannel?.stream_url || activeChannel?.youtube_live_url || '';
  const isYouTube =
    rawUrl.includes('youtube.com') ||
    rawUrl.includes('youtu.be') ||
    !!activeChannel?.youtube_live_url;

  const youtubeEmbedUrl = isYouTube
    ? getYouTubeEmbedUrl(activeChannel?.youtube_live_url || activeChannel?.stream_url)
    : '';

  // Setup HLS stream playback
  useEffect(() => {
    if (!shouldRender || isYouTube || !videoRef.current || !rawUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    const streamUrl = rawUrl.startsWith('http')
      ? `/api/tv/proxy?url=${encodeURIComponent(rawUrl)}`
      : rawUrl;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [shouldRender, isYouTube, rawUrl]);

  if (!shouldRender || !activeChannel) return null;

  const handleExpand = () => {
    setMiniOpen(false);
    setSelectedTvChannelId(activeChannel.id);
    setTvViewOpen(true);
  };

  const handleClose = () => {
    setMiniOpen(false);
    setActiveTvStream(null);
  };

  return (
    <div
      id="tv-mini-player-dock"
      className="fixed bottom-12 right-14 z-40 w-80 bg-paper border-2 border-ink rounded-xs shadow-overlay overflow-hidden flex flex-col font-ui select-none animate-in slide-in-from-bottom-2 fade-in duration-200"
    >
      {/* Broadsheet Mini Header */}
      <header className="px-2.5 py-1.5 bg-paper-alt border-b border-paper-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm shrink-0">{getCountryFlag(activeChannel.country)}</span>
          <span className="font-headline text-xs font-bold truncate text-ink">
            {activeChannel.name}
          </span>
          <span className="inline-flex items-center gap-1 px-1 py-0.2 bg-positive/10 text-positive border border-positive/30 rounded-2xs text-[0.5625rem] font-mono font-bold shrink-0">
            <Radio size={8} className="animate-pulse" />
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Expand to Full Desk */}
          <button
            type="button"
            id="btn-mini-player-expand"
            onClick={handleExpand}
            title="Expand to Full TV Desk"
            className="p-1 text-ink-secondary hover:text-ink hover:bg-paper rounded-2xs transition-colors cursor-pointer"
          >
            <Maximize2 size={12} />
          </button>

          {/* Close Mini Player */}
          <button
            type="button"
            id="btn-mini-player-close"
            onClick={handleClose}
            title="Close Stream (✕)"
            className="p-1 text-ink-secondary hover:text-ink hover:bg-paper rounded-2xs transition-colors cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      </header>

      {/* 16:9 Video Monitor Surface */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {isYouTube ? (
          <iframe
            src={youtubeEmbedUrl}
            title={activeChannel.name}
            className="w-full h-full border-0 pointer-events-auto"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted={isMuted}
            className="w-full h-full object-contain pointer-events-auto"
          />
        )}
      </div>

      {/* Mini Controls Footer */}
      <footer className="px-2.5 py-1 bg-paper-alt border-t border-paper-border flex items-center justify-between text-[0.625rem] font-mono text-ink-secondary">
        <div className="flex items-center gap-2">
          {!isYouTube && (
            <button
              type="button"
              onClick={() => {
                const next = !isMuted;
                setIsMuted(next);
                if (videoRef.current) videoRef.current.muted = next;
              }}
              className="inline-flex items-center gap-1 hover:text-ink transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX size={11} className="text-accent" /> : <Volume2 size={11} />}
              <span>{isMuted ? 'Muted' : 'Audio On'}</span>
            </button>
          )}
          <span className="text-ink-muted">·</span>
          <span>{isYouTube ? 'YouTube Live' : 'HLS Direct'}</span>
        </div>

        <button
          type="button"
          onClick={handleExpand}
          className="font-ui text-accent hover:underline cursor-pointer font-bold"
        >
          Open Desk →
        </button>
      </footer>
    </div>
  );
};

export default TVMiniPlayer;
