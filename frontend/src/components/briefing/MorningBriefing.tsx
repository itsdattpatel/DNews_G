/**
 * frontend/src/components/briefing/MorningBriefing.tsx
 * Executive Morning Radio Briefing player with Web Speech API audio synthesis and PDF export (Phase 10).
 */
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Radio, Play, Pause, RotateCcw, FileText, Download, X } from 'lucide-react';
import './MorningBriefing.css';

export const MorningBriefing: React.FC = () => {
  const isBriefingOpen = useAppStore((s) => s.isBriefingOpen);
  const setBriefingOpen = useAppStore((s) => s.setBriefingOpen);

  const [briefingText, setBriefingText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Fetch morning briefing text on open
  useEffect(() => {
    if (!isBriefingOpen) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    const fetchBriefing = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/export/briefing');
        if (res.ok) {
          const data = await res.json();
          setBriefingText(data.text || '');
        }
      } catch (err) {
        console.error('Failed to fetch morning briefing:', err);
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

  // Handle Play / Pause / Resume with Web Speech API
  const handleTogglePlay = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    const synth = window.speechSynthesis;

    if (isPlaying) {
      synth.pause();
      setIsPlaying(false);
    } else {
      if (synth.paused) {
        synth.resume();
        setIsPlaying(true);
      } else {
        synth.cancel(); // Clear any previous queue
        const utterance = new SpeechSynthesisUtterance(briefingText);
        utterance.rate = speechRate;
        utterance.pitch = 1.0;

        utterance.onend = () => {
          setIsPlaying(false);
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          setIsPlaying(false);
        };

        utteranceRef.current = utterance;
        synth.speak(utterance);
        setIsPlaying(true);
      }
    }
  };

  const handleReplay = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(briefingText);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    utteranceRef.current = utterance;
    synth.speak(utterance);
    setIsPlaying(true);
  };

  const handleRateChange = (rate: number) => {
    setSpeechRate(rate);
    if (isPlaying && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      handleReplay();
    }
  };

  // Trigger PDF Broadsheet generation & download (P10-02, P10-03)
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
      });

      if (!res.ok) throw new Error('PDF export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI_World_News_Desk_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Unable to generate PDF at this moment. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isBriefingOpen) return null;

  return (
    <div
      className="briefing-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="briefing-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) setBriefingOpen(false);
      }}
    >
      <div className="briefing-modal">
        {/* Header */}
        <header className="briefing-header">
          <div className="briefing-header-left">
            <Radio className="world-map-header-icon" size={24} color="#ef4444" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 id="briefing-heading" className="briefing-title">
                  Morning Telegraph Briefing
                </h2>
                <div className="briefing-on-air-badge">
                  <span className="briefing-on-air-dot" />
                  <span>ON AIR</span>
                </div>
              </div>
              <div className="briefing-subtitle">
                2-Minute executive synthetic voice bulletin &bull; Broadcast frequency 1420 kHz
              </div>
            </div>
          </div>

          <button
            id="btn-close-briefing"
            className="briefing-close-btn"
            onClick={() => setBriefingOpen(false)}
            aria-label="Close Morning Briefing"
          >
            <X size={20} />
          </button>
        </header>

        {/* Console Audio Player */}
        <div className="briefing-console">
          <div className="briefing-controls-left">
            <button
              id="btn-play-briefing"
              className="briefing-btn-play"
              onClick={handleTogglePlay}
              disabled={isLoading || !briefingText}
              title={isPlaying ? 'Pause broadcast' : 'Play morning briefing'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
            </button>

            <button
              id="btn-replay-briefing"
              className="briefing-btn-replay"
              onClick={handleReplay}
              disabled={isLoading || !briefingText}
              title="Replay from start"
            >
              <RotateCcw size={16} />
            </button>

            {/* Audio Visualizer Modulation Bars */}
            <div className="briefing-visualizer" aria-hidden="true">
              {[12, 22, 16, 26, 14, 20, 10, 24, 18, 8].map((h, i) => (
                <div
                  key={i}
                  className={`briefing-bar ${isPlaying ? 'active' : ''}`}
                  style={{
                    height: isPlaying ? undefined : `${h * 0.4}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Voice Speed Controls */}
          <div className="briefing-speed-selector">
            {[0.85, 1.0, 1.25].map((rate) => (
              <button
                key={rate}
                className={`briefing-speed-btn ${speechRate === rate ? 'active' : ''}`}
                onClick={() => handleRateChange(rate)}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Transcript Body */}
        <div className="briefing-body">
          <div className="briefing-transcript-label">Executive Radio Transcript</div>
          {isLoading ? (
            <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '24px 0' }}>
              Synthesizing today&apos;s morning broadcast across global telegraph bureaus...
            </div>
          ) : (
            <p className="briefing-transcript-text">{briefingText}</p>
          )}
        </div>

        {/* Footer */}
        <footer className="briefing-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={15} color="#64748b" />
            <span>Format: Broadcast Speech &bull; Synthesized by autonomous editorial chain</span>
          </div>

          <button
            id="btn-briefing-download-pdf"
            className="briefing-btn-download-pdf"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            title="Download BroadSheet Newspaper PDF"
          >
            <Download size={14} />
            <span>{isExportingPdf ? 'Printing PDF...' : "Download Today's Paper (PDF)"}</span>
          </button>
        </footer>
      </div>
    </div>
  );
};

