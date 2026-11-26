import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, Mic, FastForward, Film, 
  AlertOctagon, RefreshCw, X, Play, Pause, Bookmark, 
  Sliders, Music, RadioTower
} from 'lucide-react';
import { api } from '../../lib/api';
import { triggerHaptic } from '../../lib/haptics';
import { soundscapeEngine } from '../../lib/soundscapes';
import { useAppStore } from '../../store/useAppStore';
import type { Article } from '../../types';

export type BroadcastTab = 
  | 'podcast' 
  | 'subtitles' 
  | 'chapters' 
  | 'soundscapes' 
  | 'shortwave' 
  | 'reel' 
  | 'speed' 
  | 'cap';

interface BroadcastMediaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeArticle?: Article | null;
  initialTab?: BroadcastTab;
}

export const BroadcastMediaDrawer: React.FC<BroadcastMediaDrawerProps> = ({
  isOpen,
  onClose,
  activeArticle,
  initialTab = 'podcast',
}) => {
  const [activeTab, setActiveTab] = useState<BroadcastTab>(initialTab);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Store state for global audio & alerts
  const isSoundscapePlaying = useAppStore((s) => s.isSoundscapePlaying);
  const soundscapeLevels = useAppStore((s) => s.soundscapeLevels);
  const setSoundscapeLevels = useAppStore((s) => s.setSoundscapeLevels);
  const toggleSoundscapePlayback = useAppStore((s) => s.toggleSoundscapePlayback);
  const isShortwaveMode = useAppStore((s) => s.isShortwaveMode);
  const toggleShortwaveMode = useAppStore((s) => s.toggleShortwaveMode);
  const playbackSpeed = useAppStore((s) => s.playbackSpeed);
  const setPlaybackSpeed = useAppStore((s) => s.setPlaybackSpeed);
  const capAlerts = useAppStore((s) => s.capAlerts);
  const fetchCapAlerts = useAppStore((s) => s.fetchCapAlerts);
  const acknowledgeCapAlert = useAppStore((s) => s.acknowledgeCapAlert);

  // Tab 1: Podcast Data
  const [podcastData, setPodcastData] = useState<any | null>(null);

  // Tab 2: TV Subtitles Data
  const [selectedChannel, setSelectedChannel] = useState<number>(1);
  const [subtitlesData, setSubtitlesData] = useState<any[]>([]);

  // Tab 3: Chapters Data
  const [chaptersData, setChaptersData] = useState<any | null>(null);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(1);

  // Tab 6: 60s Reel Data & Canvas Animation
  const [reelScript, setReelScript] = useState<any | null>(null);
  const [isReelPlaying, setIsReelPlaying] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      fetchCapAlerts();
      if (activeArticle) {
        if (activeTab === 'podcast') {
          fetchPodcast(activeArticle.id, activeArticle.title_english, activeArticle.summary);
        } else if (activeTab === 'chapters') {
          fetchChapters(activeArticle.id);
        } else if (activeTab === 'reel') {
          fetchReel(activeArticle.id);
        }
      }
      if (activeTab === 'subtitles') {
        fetchSubtitles(selectedChannel);
      }
    }
  }, [isOpen, activeArticle, activeTab]);

  const fetchPodcast = async (articleId?: number, title?: string, summary?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPodcastDialogue(articleId, title, summary);
      setPodcastData(data);
    } catch {
      setError('Unable to assemble two-host radio podcast script.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubtitles = async (channelId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTvSubtitles(channelId);
      setSubtitlesData(data.transcripts);
    } catch {
      setError('Whisper speech-to-text feed disconnected.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async (articleId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAudioChapters(articleId);
      setChaptersData(data);
    } catch {
      setError('Chapter milestones could not be assembled.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReel = async (articleId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReelScript(articleId);
      setReelScript(data);
    } catch {
      setError('60-second video reel storyboard generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: BroadcastTab) => {
    triggerHaptic('selection');
    setActiveTab(tab);
    setError(null);

    if (tab === 'podcast' && activeArticle && !podcastData) {
      fetchPodcast(activeArticle.id, activeArticle.title_english, activeArticle.summary);
    } else if (tab === 'subtitles') {
      fetchSubtitles(selectedChannel);
    } else if (tab === 'chapters' && activeArticle && !chaptersData) {
      fetchChapters(activeArticle.id);
    } else if (tab === 'reel' && activeArticle && !reelScript) {
      fetchReel(activeArticle.id);
    } else if (tab === 'cap') {
      fetchCapAlerts();
    }
  };

  const handleArchiveSubtitle = async (item: any) => {
    try {
      await api.archiveTvSubtitle(selectedChannel, item.text_content, item.segment_title, item.speaker_label);
      triggerHaptic('bookmark');
      fetchSubtitles(selectedChannel);
    } catch {
      setError('Failed to archive subtitle to Morgue.');
    }
  };

  // Render simple canvas animation for 60s Reel
  useEffect(() => {
    if (activeTab === 'reel' && canvasRef.current && reelScript) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let frame = 0;
      let animId: number;

      const render = () => {
        ctx.fillStyle = '#FAF7F0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Broadsheet border
        ctx.strokeStyle = '#1A1208';
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Masthead
        ctx.fillStyle = '#1A1208';
        ctx.font = 'bold 16px serif';
        ctx.textAlign = 'center';
        ctx.fillText('THE DAILY BUGLE · 60S REEL', canvas.width / 2, 40);

        // Animated Headline Box
        const scene = reelScript.scenes[Math.floor((frame / 90) % reelScript.scenes.length)];
        if (scene) {
          ctx.fillStyle = '#C0392B';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(scene.caption, canvas.width / 2, 80);

          ctx.fillStyle = '#1A1208';
          ctx.font = '12px serif';
          const words = (scene.highlightText || '').split(' ');
          let line = '';
          let y = 120;
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            if (testLine.length > 24) {
              ctx.fillText(line, canvas.width / 2, y);
              line = words[n] + ' ';
              y += 20;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, canvas.width / 2, y);
        }

        // Animated progress line
        const progress = (frame % 360) / 360;
        ctx.fillStyle = '#C0392B';
        ctx.fillRect(20, canvas.height - 25, (canvas.width - 40) * progress, 5);

        frame++;
        if (isReelPlaying) {
          animId = requestAnimationFrame(render);
        }
      };

      render();
      return () => {
        if (animId) cancelAnimationFrame(animId);
      };
    }
  }, [activeTab, reelScript, isReelPlaying]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="broadcast-desk-title"
    >
      <div className="relative flex flex-col w-full max-w-5xl h-[92vh] max-h-[860px] bg-[var(--color-paper)] border-2 border-[var(--color-paper-border)] shadow-2xl overflow-hidden rounded-none text-[var(--color-ink)]">
        
        {/* Newspaper Masthead Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-[var(--color-paper-alt)] border-b-2 border-[var(--color-paper-border)]">
          <div className="flex items-center space-x-3">
            <span className="border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-0.5 text-xs font-mono uppercase tracking-widest font-bold">
              Broadsheet Soundstage
            </span>
            <h2 id="broadcast-desk-title" className="text-lg sm:text-xl font-serif font-black tracking-tight text-[var(--color-ink)]">
              BROADCAST, AUDIO &amp; MEDIA SYNTHESIS
            </h2>
          </div>
          <button
            onClick={() => {
              triggerHaptic('selection');
              onClose();
            }}
            aria-label="Close Broadcast Desk"
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-border)]/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 8-Tab Navigation Bar */}
        <nav 
          aria-label="Broadcast Desks"
          className="flex overflow-x-auto no-scrollbar border-b border-[var(--color-paper-border)] bg-[var(--color-paper)] text-xs font-mono uppercase tracking-wider divide-x divide-[var(--color-paper-border)]"
        >
          <button
            onClick={() => handleTabChange('podcast')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'podcast' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>#21 Radio Podcast</span>
          </button>

          <button
            onClick={() => handleTabChange('subtitles')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'subtitles' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>#22 Whisper Subtitles</span>
          </button>

          <button
            onClick={() => handleTabChange('chapters')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'chapters' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>#23 Chapters</span>
          </button>

          <button
            onClick={() => handleTabChange('soundscapes')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'soundscapes' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>#24 Press Soundscapes</span>
          </button>

          <button
            onClick={() => handleTabChange('shortwave')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'shortwave' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <RadioTower className="w-3.5 h-3.5" />
            <span>#25 1938 Radio</span>
          </button>

          <button
            onClick={() => handleTabChange('reel')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'reel' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>#26 60s Reel</span>
          </button>

          <button
            onClick={() => handleTabChange('speed')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'speed' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>#27 Playback Speed</span>
          </button>

          <button
            onClick={() => handleTabChange('cap')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'cap' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>#28 CAP Emergency</span>
          </button>
        </nav>

        {/* Desk Body Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--color-paper)]">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-600 text-red-900 text-sm font-sans flex items-center space-x-2">
              <AlertOctagon className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--color-ink-muted)] space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin text-[var(--color-accent)]" />
              <p className="font-mono text-xs uppercase tracking-wider">
                Synthesizing Broadcast Audio &amp; Media...
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: PODCAST MODE */}
              {activeTab === 'podcast' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #21 · Two-Host Radio Podcast
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      "The Newsroom Dispatch" (Two-Host Audio Mode)
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Synthesizes a conversational radio briefing between Anchor Julian Vance and Chief Investigative Reporter Evelyn Reed.
                    </p>
                  </div>

                  {podcastData ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-[var(--color-paper-alt)] border-2 border-[var(--color-paper-border)] flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-mono text-[var(--color-accent)] uppercase tracking-widest font-bold">
                            BROADCAST TITLE
                          </div>
                          <div className="font-serif font-bold text-base text-[var(--color-ink)]">
                            {podcastData.episodeTitle}
                          </div>
                        </div>
                        <span className="text-xs font-mono text-[var(--color-ink-muted)]">
                          ~{podcastData.estimatedDurationSeconds}s runtime
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {podcastData.dialogue?.map((turn: any, idx: number) => (
                          <div 
                            key={idx}
                            className={`p-3.5 border ${
                              turn.speaker === 'anchor' 
                                ? 'bg-[var(--color-paper-alt)] border-l-4 border-l-[var(--color-accent)] mr-6'
                                : 'bg-[var(--color-paper)] border-[var(--color-paper-border)] border-l-4 border-l-emerald-700 ml-6'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider mb-1">
                              <span className={turn.speaker === 'anchor' ? 'text-[var(--color-accent)] font-bold' : 'text-emerald-800 font-bold'}>
                                {turn.name}
                              </span>
                              <span className="text-[var(--color-ink-muted)] italic">
                                {turn.voiceHint}
                              </span>
                            </div>
                            <p className="font-serif text-sm leading-relaxed text-[var(--color-ink)]">
                              "{turn.text}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-[var(--color-ink-muted)] font-mono text-sm border-2 border-dashed border-[var(--color-paper-border)]">
                      Select an article to synthesize two-host radio podcast dialogue.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: WHISPER TV SUBTITLES */}
              {activeTab === 'subtitles' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #22 · Offline Speech-to-Text
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Whisper Local Speech-to-Text Subtitles &amp; Archival
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Transcribes broadcast audio into searchable broadsheet subtitles with single-click archival to your local Morgue.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase text-[var(--color-ink-muted)]">Select Feed:</span>
                    {[1, 2, 3].map((ch) => (
                      <button
                        key={ch}
                        onClick={() => {
                          setSelectedChannel(ch);
                          fetchSubtitles(ch);
                        }}
                        className={`px-3 py-1 text-xs font-mono border ${
                          selectedChannel === ch 
                            ? 'bg-[var(--color-ink)] text-[var(--color-paper)] font-bold' 
                            : 'border-[var(--color-paper-border)] hover:bg-[var(--color-paper-alt)]'
                        }`}
                      >
                        Channel #{ch}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {subtitlesData.map((item, idx) => (
                      <div key={idx} className="p-3 border border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--color-ink-muted)]">
                            <span className="font-bold text-[var(--color-accent)]">{item.speaker_label || 'Speaker'}</span>
                            <span>·</span>
                            <span>{item.segment_title}</span>
                            <span>·</span>
                            <span>{new Date(item.timestamp_utc).toLocaleTimeString()}</span>
                          </div>
                          <p className="font-serif text-sm text-[var(--color-ink)] leading-relaxed">
                            {item.text_content}
                          </p>
                        </div>
                        <button
                          onClick={() => handleArchiveSubtitle(item)}
                          className="px-2.5 py-1 text-[10px] font-mono border border-[var(--color-paper-border)] bg-[var(--color-paper)] hover:border-[var(--color-accent)] transition-colors flex items-center gap-1 shrink-0"
                          title="Archive Subtitle Snippet to Morgue"
                        >
                          <Bookmark className="w-3 h-3 text-[var(--color-accent)]" />
                          <span>Archive</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: CHAPTER SCRUBBER */}
              {activeTab === 'chapters' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #23 · Audio Navigation
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Interactive Audio Bar with Chapter Scrubber
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Timecoded chapter navigation with tactile brass milestone pips across World, Markets, Quotes, and Analysis.
                    </p>
                  </div>

                  {chaptersData ? (
                    <div className="p-5 border-2 border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] space-y-5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span>TOTAL RUNTIME: {chaptersData.formattedDuration}</span>
                        <span className="text-[var(--color-accent)] font-bold">
                          CHAPTER {activeChapterIndex} OF {chaptersData.chapters.length}
                        </span>
                      </div>

                      {/* Tactile Brass Milestone Scrubber */}
                      <div className="relative py-3">
                        <div className="w-full bg-[var(--color-paper-border)] h-2 rounded-none relative">
                          <div 
                            className="bg-[var(--color-accent)] h-full transition-all duration-300"
                            style={{ width: `${(activeChapterIndex / chaptersData.chapters.length) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between -mt-3.5 px-1">
                          {chaptersData.chapters.map((ch: any) => (
                            <button
                              key={ch.index}
                              onClick={() => {
                                setActiveChapterIndex(ch.index);
                                triggerHaptic('selection');
                              }}
                              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                                ch.index === activeChapterIndex 
                                  ? 'bg-[var(--color-accent)] border-[var(--color-paper)] text-white' 
                                  : 'bg-[var(--color-paper-alt)] border-[var(--color-ink)]'
                              }`}
                              title={ch.title}
                            >
                              <span className="text-[9px] font-mono font-bold">{ch.index}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Selected Chapter Detail Card */}
                      {chaptersData.chapters.map((ch: any) => ch.index === activeChapterIndex && (
                        <div key={ch.index} className="p-4 bg-[var(--color-paper)] border border-[var(--color-paper-border)] space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[var(--color-accent)] font-bold uppercase tracking-widest">
                              [{ch.formattedTime}] {ch.sectionCategory}
                            </span>
                            <span className="text-[var(--color-ink-muted)]">Milestone Pip #{ch.index}</span>
                          </div>
                          <h4 className="font-serif font-black text-base text-[var(--color-ink)]">
                            {ch.title}
                          </h4>
                          <p className="font-sans text-xs text-[var(--color-ink-secondary)]">
                            {ch.summarySnippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-[var(--color-ink-muted)] font-mono text-sm border-2 border-dashed border-[var(--color-paper-border)]">
                      Select an article to calculate audio chapter timecodes.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: AMBIENT SOUNDSCAPES */}
              {activeTab === 'soundscapes' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #24 · Procedural Pressroom Atmosphere
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Soundtrack for Reading (Ambient Pressroom Soundscapes)
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      100% procedural Web Audio soundscapes synthesized in real time. Zero external MP3 files downloaded.
                    </p>
                  </div>

                  <div className="p-5 border-2 border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            triggerHaptic('selection');
                            toggleSoundscapePlayback();
                          }}
                          className={`px-4 py-2 font-mono text-xs uppercase tracking-wider font-bold flex items-center gap-2 transition-colors ${
                            isSoundscapePlaying 
                              ? 'bg-[var(--color-accent)] text-white' 
                              : 'bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-accent)]'
                          }`}
                        >
                          {isSoundscapePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          <span>{isSoundscapePlaying ? 'Stop Soundscape' : 'Start Soundscape'}</span>
                        </button>
                        <span className="text-xs font-mono text-[var(--color-ink-muted)]">
                          {isSoundscapePlaying ? '● PROCEDURAL SYNTH ACTIVE' : '○ ENGINE IDLE'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span>Windowpane Rain (Pink Noise Resonator)</span>
                          <span className="font-bold">{soundscapeLevels.rain}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={soundscapeLevels.rain}
                          onChange={(e) => setSoundscapeLevels({ ...soundscapeLevels, rain: Number(e.target.value) })}
                          className="w-full accent-[var(--color-accent)]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span>Linotype Printing Press (Mechanical Rhythm)</span>
                          <span className="font-bold">{soundscapeLevels.press}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={soundscapeLevels.press}
                          onChange={(e) => setSoundscapeLevels({ ...soundscapeLevels, press: Number(e.target.value) })}
                          className="w-full accent-[var(--color-accent)]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-mono mb-1">
                          <span>Coal Hearth &amp; Paper Rustle (Brownian Noise)</span>
                          <span className="font-bold">{soundscapeLevels.hearth}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={soundscapeLevels.hearth}
                          onChange={(e) => setSoundscapeLevels({ ...soundscapeLevels, hearth: Number(e.target.value) })}
                          className="w-full accent-[var(--color-accent)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: 1938 SHORTWAVE RADIO */}
              {activeTab === 'shortwave' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #25 · Vacuum Tube Simulator
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      1938 Archival Radio Broadcast Simulator
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Emulates transatlantic vacuum tube shortwave radio: 300Hz–3kHz bandpass curve, 60Hz mains hum, and vinyl crackle.
                    </p>
                  </div>

                  <div className="p-6 border-4 border-double border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-bold">
                          1938 SHORTWAVE FILTER
                        </div>
                        <h4 className="font-serif font-bold text-lg text-[var(--color-ink)]">
                          Transatlantic Radio Tube Emulation
                        </h4>
                      </div>
                      <button
                        onClick={() => {
                          triggerHaptic('selection');
                          toggleShortwaveMode();
                        }}
                        className={`px-4 py-2 font-mono text-xs uppercase tracking-wider font-bold transition-colors ${
                          isShortwaveMode 
                            ? 'bg-amber-800 text-white border border-amber-900' 
                            : 'bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-accent)]'
                        }`}
                      >
                        {isShortwaveMode ? '● SHORTWAVE ACTIVE' : '○ ACTIVATE 1938 RADIO'}
                      </button>
                    </div>

                    <div className="p-4 bg-[var(--color-paper)] border border-[var(--color-paper-border)] text-xs font-mono space-y-2">
                      <div className="text-[var(--color-ink-muted)] uppercase tracking-wider">
                        Active Biquad DSP Chain:
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-[var(--color-ink)]">
                        <li>Bandpass Filter: 300 Hz – 3,200 Hz (Resonant Q = 1.4)</li>
                        <li>Vacuum Tube Mains Hum: 60 Hz Sine Wave at -28 dB</li>
                        <li>Vinyl Surface Crackle &amp; Needle Static Synthesis</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: 60-SECOND REEL STUDIO */}
              {activeTab === 'reel' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #26 · Mobile Broadsheet Reel
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Automated 60-Second Video Reel Generator
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Generates a vertical 9:16 animated newspaper broadsheet summary suitable for mobile power users.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="flex flex-col items-center">
                      <canvas
                        ref={canvasRef}
                        width={270}
                        height={480}
                        className="border-2 border-[var(--color-paper-border)] shadow-md bg-[var(--color-paper)]"
                      />
                      <button
                        onClick={() => setIsReelPlaying(!isReelPlaying)}
                        className="mt-3 px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-mono text-xs uppercase tracking-wider hover:bg-[var(--color-accent)] transition-colors flex items-center gap-1.5"
                      >
                        {isReelPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isReelPlaying ? 'Pause Reel' : 'Play 60s Reel Preview'}</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-mono uppercase text-[var(--color-ink-muted)]">
                        Storyboard Timings:
                      </div>
                      {reelScript?.scenes?.map((sc: any, idx: number) => (
                        <div key={idx} className="p-3 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] text-xs font-mono space-y-1">
                          <div className="flex justify-between font-bold text-[var(--color-accent)]">
                            <span>Scene #{sc.sceneIndex}: {sc.caption}</span>
                            <span>{sc.durationSeconds}s</span>
                          </div>
                          <p className="font-sans text-[11px] text-[var(--color-ink-secondary)]">
                            {sc.highlightText}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: PLAYBACK SPEED */}
              {activeTab === 'speed' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #27 · Pitch Preservation
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Pitch-Compensated Variable Speed Playback
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Rapid article listening from 1.0x to 3.0x speed without high-pitched vocal distortion.
                    </p>
                  </div>

                  <div className="p-6 border-2 border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-ink-muted)]">
                        Current Playback Rate
                      </span>
                      <span className="text-xl font-mono font-bold text-[var(--color-accent)]">
                        {playbackSpeed.toFixed(2)}x
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {[1.0, 1.25, 1.5, 2.0, 3.0].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            triggerHaptic('selection');
                            setPlaybackSpeed(rate);
                          }}
                          className={`p-3 text-xs font-mono font-bold border transition-colors ${
                            playbackSpeed === rate 
                              ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' 
                              : 'bg-[var(--color-paper)] border-[var(--color-paper-border)] hover:bg-[var(--color-paper-alt)]'
                          }`}
                        >
                          {rate.toFixed(2)}x
                        </button>
                      ))}
                    </div>

                    <div className="p-3 bg-[var(--color-paper)] border-l-4 border-emerald-700 text-xs font-mono text-[var(--color-ink-secondary)]">
                      <strong>Phase Vocoder:</strong> Web Audio <code>preservesPitch = true</code> active. Vocal timbre remains natural across all playback rates.
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: CAP EMERGENCY ALERTS */}
              {activeTab === 'cap' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #28 · Civil Emergency Protocol
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Common Alerting Protocol (CAP) Emergency Broadcast
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Life-safety hazard telegraph polling USGS, NOAA, and GDACS feeds with Morse-code alerts.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          triggerHaptic('selection');
                          soundscapeEngine.playTelegraphChirp();
                        }}
                        className="px-3 py-1.5 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] hover:border-[var(--color-accent)] text-xs font-mono transition-colors flex items-center gap-1.5"
                      >
                        <span>🔊 Test Telegraph Chirp</span>
                      </button>
                      <span className="text-xs font-mono text-[var(--color-ink-muted)]">
                        {capAlerts.length} Active Feeds
                      </span>
                    </div>

                    {capAlerts.length > 0 ? (
                      capAlerts.map((alert) => (
                        <div 
                          key={alert.id}
                          className={`p-4 border-2 ${
                            alert.severity === 'Severe' || alert.severity === 'Extreme'
                              ? 'border-red-600 bg-red-50/60'
                              : 'border-amber-600 bg-amber-50/60'
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-[var(--color-paper-border)] pb-2 mb-2">
                            <span className="text-xs font-mono font-bold uppercase text-red-900 tracking-wider">
                              {alert.event} ({alert.severity})
                            </span>
                            <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                              {alert.source_agency}
                            </span>
                          </div>

                          <h4 className="font-serif font-bold text-base text-[var(--color-ink)]">
                            {alert.headline}
                          </h4>

                          <p className="font-serif text-xs text-[var(--color-ink-secondary)] mt-1 leading-relaxed">
                            {alert.description}
                          </p>

                          <div className="mt-3 flex items-center justify-between text-[10px] font-mono border-t border-[var(--color-paper-border)] pt-2">
                            <span className="text-[var(--color-ink-muted)]">SECTOR: {alert.area_desc}</span>
                            {alert.acknowledged ? (
                              <span className="text-emerald-800 font-bold">✓ ACKNOWLEDGED</span>
                            ) : (
                              <button
                                onClick={() => acknowledgeCapAlert(alert.id)}
                                className="px-2 py-0.5 bg-red-800 text-white font-bold hover:bg-red-900 transition-colors"
                              >
                                Acknowledge Notice
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-[var(--color-ink-muted)] font-mono text-sm border-2 border-dashed border-[var(--color-paper-border)]">
                        No active civil hazard notices on wire.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="px-4 py-2 bg-[var(--color-paper-alt)] border-t border-[var(--color-paper-border)] flex items-center justify-between text-xs font-mono text-[var(--color-ink-muted)]">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isSoundscapePlaying ? 'bg-amber-600 animate-pulse' : 'bg-emerald-600'}`} />
            <span>SOUNDSTAGE: {isSoundscapePlaying ? 'LIVE TRANSMITTING' : 'MONITORING'}</span>
          </div>
          <div className="flex items-center space-x-3">
            <span>Esc: Close</span>
            <span>Tab: Switch Desk</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
