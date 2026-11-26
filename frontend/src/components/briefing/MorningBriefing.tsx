/**
 * frontend/src/components/briefing/MorningBriefing.tsx
 * Screen (j): Morning Radio Briefing `/briefing`.
 * Broadsheet telegraph console, Web Speech API audio synthesis, karaoke sentence highlighting,
 * 4-speed selectors (0.75x, 1x, 1.25x, 1.5x), equalizer modulation bars, and daily PDF trigger.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  splitIntoSentences,
  clampSpeechRate,
  formatBriefingDate,
  formatAudioTime,
  calculateReadingTimeSeconds,
  type SpeechRate,
  ALLOWED_SPEECH_RATES,
} from '../../utils/briefing-pdf';
import {
  Radio,
  Play,
  Pause,
  RotateCcw,
  Square,
  FileText,
  Volume2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

export const MorningBriefing: React.FC = () => {
  const isBriefingOpen = useAppStore((s) => s.isBriefingOpen);
  const setBriefingOpen = useAppStore((s) => s.setBriefingOpen);
  const setPdfOpen = useAppStore((s) => s.setPdfOpen);

  const [briefingText, setBriefingText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<SpeechRate>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [ttsUnavailable, setTtsUnavailable] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Parse briefing text into sentence units
  const sentences = useMemo(() => splitIntoSentences(briefingText), [briefingText]);
  const totalSeconds = useMemo(
    () => calculateReadingTimeSeconds(briefingText, speechRate),
    [briefingText, speechRate]
  );

  // Check TTS availability & populate voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTtsUnavailable(true);
      return;
    }

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
        // Default to first English voice or first voice
        const english = available.find((v) => v.lang.startsWith('en')) || available[0];
        setSelectedVoiceUri(english.voiceURI);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Fetch briefing text from GET /api/export/briefing
  useEffect(() => {
    if (!isBriefingOpen) {
      stopPlayback();
      return;
    }

    const fetchBriefing = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch('/api/export/briefing');
        if (res.ok) {
          const data = await res.json();
          setBriefingText(data.text || '');
        } else {
          setBriefingText('');
        }
      } catch (err) {
        console.error('[MorningBriefing] Failed to fetch briefing:', err);
        setBriefingText('');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBriefing();
  }, [isBriefingOpen]);

  // Keyboard navigation: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBriefingOpen) {
        setBriefingOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBriefingOpen, setBriefingOpen]);

  // Elapsed timer ticker for progress display
  useEffect(() => {
    if (isPlaying && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev >= totalSeconds) {
            return totalSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, isPaused, totalSeconds]);

  // Stop & clear all TTS utterances
  const stopPlayback = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setActiveSentenceIndex(0);
    setElapsedSeconds(0);
  };

  // Start speech synthesis from a specific sentence index
  const startSpeakingFromSentence = (startIndex: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTtsUnavailable(true);
      return;
    }

    window.speechSynthesis.cancel();

    const remainingSentences = sentences.slice(startIndex);
    if (remainingSentences.length === 0) {
      stopPlayback();
      return;
    }

    const textToSpeak = remainingSentences.join(' ');
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    if (selectedVoiceUri) {
      const selectedVoice = voices.find((v) => v.voiceURI === selectedVoiceUri);
      if (selectedVoice) utterance.voice = selectedVoice;
    }

    // Boundary events to update active sentence highlight
    utterance.onboundary = (e) => {
      if (e.name === 'word' || e.name === 'sentence') {
        const spokenChars = e.charIndex;
        let cumulative = 0;
        for (let i = startIndex; i < sentences.length; i++) {
          cumulative += sentences[i].length + 1;
          if (spokenChars < cumulative) {
            setActiveSentenceIndex(i);
            break;
          }
        }
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setActiveSentenceIndex(sentences.length - 1);
      setElapsedSeconds(totalSeconds);
    };

    utterance.onerror = (e) => {
      console.warn('[MorningBriefing] SpeechSynthesis error:', e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
    setActiveSentenceIndex(startIndex);
  };

  const handleTogglePlay = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTtsUnavailable(true);
      return;
    }

    const synth = window.speechSynthesis;

    if (isPlaying) {
      synth.pause();
      setIsPaused(true);
      setIsPlaying(false);
    } else {
      if (isPaused && synth.paused) {
        synth.resume();
        setIsPaused(false);
        setIsPlaying(true);
      } else {
        startSpeakingFromSentence(activeSentenceIndex || 0);
      }
    }
  };

  const handleReplay = () => {
    setElapsedSeconds(0);
    startSpeakingFromSentence(0);
  };

  const handleSpeedChange = (rate: SpeechRate) => {
    const clamped = clampSpeechRate(rate);
    setSpeechRate(clamped);
    if (isPlaying) {
      startSpeakingFromSentence(activeSentenceIndex);
    }
  };

  // Generate ASCII-style block progress: e.g. ■■■■■■■■□□□□□□
  const progressBlocks = useMemo(() => {
    const totalBlocks = 36;
    const ratio = totalSeconds > 0 ? Math.min(1, elapsedSeconds / totalSeconds) : 0;
    const filledBlocks = Math.round(ratio * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    return '■'.repeat(filledBlocks) + '□'.repeat(emptyBlocks);
  }, [elapsedSeconds, totalSeconds]);

  if (!isBriefingOpen) return null;

  const todayFormatted = formatBriefingDate();

  return (
    <div
      id="morning-briefing-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/75 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopPlayback();
          setBriefingOpen(false);
        }
      }}
    >
      <div className="flex flex-col w-full max-w-4xl h-[90vh] bg-paper text-ink border-2 border-ink shadow-overlay overflow-hidden relative">
        {/* Vintage Radio Console Masthead */}
        <header className="px-6 py-4 border-b-2 border-ink bg-paper-alt flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-ink bg-paper text-accent">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div
                  id="briefing-on-air-badge"
                  className="flex items-center gap-1.5 px-2 py-0.5 border border-accent bg-accent/10 font-mono text-[10px] font-bold text-accent tracking-widest uppercase"
                >
                  <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                  <span>ON AIR</span>
                </div>
                <h2 id="briefing-heading" className="font-masthead text-xl tracking-tight text-ink font-black uppercase">
                  Morning Telegraph Radio
                </h2>
              </div>
              <p className="font-serif text-xs text-ink-secondary italic mt-0.5">
                {todayFormatted} • 2-Minute autonomous voice dispatch • Broadcast frequency 1420 kHz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-briefing"
              onClick={() => {
                stopPlayback();
                setBriefingOpen(false);
              }}
              className="p-1.5 border border-paper-border hover:border-ink hover:bg-paper text-ink transition-colors"
              aria-label="Close Morning Radio Briefing"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Audio Console Controls Bar */}
        <section className="px-6 py-3 border-b-2 border-ink bg-paper flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          {/* Playback Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="btn-play-briefing"
              onClick={handleTogglePlay}
              disabled={isLoading || !briefingText}
              className={`flex items-center gap-1.5 px-4 py-1.5 border-2 border-ink font-mono text-xs uppercase tracking-wider font-bold transition-colors ${
                isPlaying
                  ? 'bg-ink text-paper hover:bg-ink-secondary'
                  : 'bg-paper text-ink hover:bg-ink hover:text-paper'
              } disabled:opacity-40`}
              title={isPlaying ? 'Pause broadcast' : 'Play broadcast'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              <span>{isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}</span>
            </button>

            <button
              id="btn-stop-briefing"
              onClick={stopPlayback}
              disabled={!isPlaying && !isPaused && elapsedSeconds === 0}
              className="p-1.5 border border-ink bg-paper hover:bg-ink hover:text-paper text-ink transition-colors disabled:opacity-40"
              title="Stop broadcast"
            >
              <Square className="w-4 h-4" />
            </button>

            <button
              id="btn-replay-briefing"
              onClick={handleReplay}
              disabled={isLoading || !briefingText}
              className="p-1.5 border border-ink bg-paper hover:bg-ink hover:text-paper text-ink transition-colors disabled:opacity-40"
              title="Replay from start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Modulation Equalizer Bars */}
            <div
              id="briefing-equalizer-bars"
              className="flex items-end gap-1 h-6 px-3 py-1 border border-paper-border bg-paper-alt"
              aria-hidden="true"
            >
              {[14, 24, 18, 28, 12, 22, 10, 26, 20, 16, 24, 12].map((height, i) => (
                <div
                  key={i}
                  className={`w-1 bg-ink transition-all duration-150 ${
                    isPlaying ? 'opacity-100' : 'opacity-30'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(4, (height * ((i % 3) + 1)) % 22)}px` : '4px',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Speed & Voice Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="font-serif text-ink-secondary font-bold mr-1">Speed:</span>
              {ALLOWED_SPEECH_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`px-2 py-0.5 border text-xs font-mono font-bold transition-colors ${
                    speechRate === rate
                      ? 'border-ink bg-ink text-paper'
                      : 'border-paper-border bg-paper hover:border-ink text-ink'
                  }`}
                >
                  {rate}×
                </button>
              ))}
            </div>

            {voices.length > 0 && (
              <div className="hidden md:flex items-center gap-1">
                <span className="font-serif text-ink-secondary font-bold mr-1">Voice:</span>
                <select
                  id="briefing-voice-select"
                  value={selectedVoiceUri}
                  onChange={(e) => {
                    setSelectedVoiceUri(e.target.value);
                    if (isPlaying) {
                      startSpeakingFromSentence(activeSentenceIndex);
                    }
                  }}
                  className="px-2 py-0.5 border border-ink bg-paper-alt text-ink font-mono text-[11px] max-w-[160px] truncate focus:outline-none"
                >
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Progress & Time Gauge Bar */}
        <div className="px-6 py-2 border-b border-paper-border bg-paper-alt flex items-center justify-between text-xs font-mono text-ink-secondary">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="text-accent tracking-tighter select-none font-bold">
              {progressBlocks}
            </span>
          </div>
          <div className="font-bold whitespace-nowrap pl-4">
            {formatAudioTime(elapsedSeconds, totalSeconds)}
          </div>
        </div>

        {/* Main Transcript Stage with Karaoke Sentence Sync */}
        <main className="flex-1 bg-paper p-6 sm:p-8 overflow-y-auto select-text">
          {isLoading && (
            <div id="briefing-loading-state" className="flex flex-col items-center justify-center text-center p-8">
              <div className="w-8 h-8 border-2 border-ink border-t-accent rounded-full animate-spin mb-3" />
              <div className="font-mono text-xs tracking-widest uppercase text-accent font-bold mb-1">
                TUNING TELEGRAPH RELAYS
              </div>
              <p className="font-serif text-sm text-ink-secondary italic">
                Preparing your briefing… Transcribing lead stories into broadcast speech.
              </p>
            </div>
          )}

          {!isLoading && ttsUnavailable && (
            <div className="flex items-center gap-2 p-3 border border-negative bg-negative/10 font-mono text-xs text-negative mb-4">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Speech synthesis unavailable in this browser. You can still read the transcript below.</span>
            </div>
          )}

          {!isLoading && sentences.length === 0 && (
            <div id="briefing-empty-state" className="text-center p-8 font-serif text-ink-secondary italic">
              <p className="text-base font-bold text-ink mb-1">No stories yet for today.</p>
              <p className="text-xs">Monitored wire frequencies report all quiet across monitored regions.</p>
            </div>
          )}

          {!isLoading && sentences.length > 0 && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="font-mono text-[11px] tracking-widest uppercase text-ink-muted border-b border-paper-border pb-1 mb-4 flex items-center justify-between">
                <span>Executive Radio Transcript</span>
                <span>Click any sentence to jump speech</span>
              </div>

              <div className="font-serif text-base sm:text-lg leading-relaxed text-ink space-y-3">
                {sentences.map((sentence, idx) => {
                  const isActive = activeSentenceIndex === idx;
                  return (
                    <span
                      key={idx}
                      id={`sentence-${idx}`}
                      onClick={() => {
                        setActiveSentenceIndex(idx);
                        startSpeakingFromSentence(idx);
                      }}
                      className={`cursor-pointer transition-all duration-200 rounded-xs px-2 py-0.5 inline-block mr-1 my-0.5 ${
                        isActive
                          ? 'bg-ink text-paper font-semibold shadow-xs ring-2 ring-accent'
                          : 'hover:bg-paper-alt hover:text-ink-secondary'
                      }`}
                      title="Click to play from here"
                    >
                      {sentence}{' '}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* Broadsheet Console Footer */}
        <footer className="px-6 py-3 border-t-2 border-ink bg-paper-alt flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none">
          <div className="flex items-center gap-2 text-ink-secondary">
            <Volume2 className="w-4 h-4 text-accent" />
            <span>Format: Radio Broadcast • Autonomous Editorial Telegraph Desk</span>
          </div>

          <button
            id="btn-open-pdf-from-briefing"
            onClick={() => {
              stopPlayback();
              setBriefingOpen(false);
              setPdfOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 border border-ink bg-paper hover:bg-ink hover:text-paper font-mono text-xs uppercase font-bold tracking-wider transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Open Today's Broadsheet PDF</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

export default MorningBriefing;
