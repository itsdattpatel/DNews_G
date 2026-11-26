/**
 * frontend/src/components/pdf/DailyPdfDesk.tsx
 * Screen (i): Daily Newspaper PDF Generation & Folio Preview Desk.
 * Broadsheet 1920s newspaper styling, date picker, authentic folio newspaper preview,
 * PDF iframe preview, download trigger, loading ink drip states, empty states, and error handling.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getPdfDownloadFilename, formatBriefingDate } from '../../utils/briefing-pdf';
import { FileText, Download, RotateCcw, X, Calendar, AlertCircle, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';

export const DailyPdfDesk: React.FC = () => {
  const isPdfOpen = useAppStore((s) => s.isPdfOpen);
  const setPdfOpen = useAppStore((s) => s.setPdfOpen);
  const articles = useAppStore((s) => s.articles);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isEmpty, setIsEmpty] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'folio' | 'iframe'>('folio');

  const currentBlobRef = useRef<string | null>(null);

  // Clean up blob URL on unmount or new generation
  const revokeCurrentBlob = () => {
    if (currentBlobRef.current) {
      URL.revokeObjectURL(currentBlobRef.current);
      currentBlobRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokeCurrentBlob();
    };
  }, []);

  // Keyboard navigation: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPdfOpen) {
        setPdfOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPdfOpen, setPdfOpen]);

  // Generate PDF from backend POST /api/export/pdf
  const handleGeneratePdf = async (targetDate: string = selectedDate) => {
    setIsLoading(true);
    setHasError(false);
    setIsEmpty(false);

    try {
      const res = await apiFetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: targetDate }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const blob = await res.blob();
      if (blob.size < 500) {
        setIsEmpty(true);
        return;
      }

      revokeCurrentBlob();
      const newUrl = URL.createObjectURL(blob);
      currentBlobRef.current = newUrl;
      setPdfBlobUrl(newUrl);
      toast.success('Broadsheet PDF edition compiled successfully.');
    } catch (err) {
      console.error('[DailyPdfDesk] Generation failed:', err);
      setHasError(true);
      toast.error('Failed to compile newspaper edition.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger initial compilation when opened if no PDF loaded yet
  useEffect(() => {
    if (isPdfOpen && !pdfBlobUrl && !isLoading && !hasError) {
      handleGeneratePdf(selectedDate);
    }
  }, [isPdfOpen]);

  // Download compiled PDF file to user's disk
  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = getPdfDownloadFilename(selectedDate);
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success(`Broadsheet edition downloaded: ${getPdfDownloadFilename(selectedDate)}`);
  };

  if (!isPdfOpen) return null;

  const leadStory = articles[0];
  const secondaryStories = articles.slice(1, 5);
  const formattedDate = formatBriefingDate(selectedDate);

  return (
    <div
      id="daily-pdf-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-pdf-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/75 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) setPdfOpen(false);
      }}
    >
      <div className="flex flex-col w-full max-w-5xl h-[92vh] bg-paper text-ink border-2 border-ink shadow-overlay overflow-hidden relative">
        {/* Masthead Header */}
        <header className="px-6 py-4 border-b-2 border-ink bg-paper-alt flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-ink bg-paper text-ink">
              <Printer className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-widest uppercase bg-ink text-paper px-1.5 py-0.5 font-bold">
                  DAILY FOLIO
                </span>
                <h2 id="daily-pdf-heading" className="font-masthead text-xl tracking-tight text-ink font-black uppercase">
                  Daily Broadsheet Edition
                </h2>
              </div>
              <p className="font-serif text-xs text-ink-secondary italic mt-0.5">
                Archival printable newspaper compiled by autonomous wire editors • Vector typography
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-pdf-desk"
              onClick={() => setPdfOpen(false)}
              className="p-1.5 border border-paper-border hover:border-ink hover:bg-paper text-ink transition-colors"
              aria-label="Close Daily PDF Desk"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Action & Date Controls Bar */}
        <section className="px-6 py-3 border-b-2 border-ink bg-paper flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <label htmlFor="pdf-date-picker" className="flex items-center gap-1.5 font-serif text-ink-secondary font-bold">
              <Calendar className="w-4 h-4 text-ink-secondary" />
              <span>Edition Date:</span>
            </label>
            <input
              id="pdf-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
              }}
              className="px-2 py-1 border border-ink bg-paper-alt text-ink font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ink"
            />

            <button
              id="btn-generate-pdf"
              onClick={() => handleGeneratePdf(selectedDate)}
              disabled={isLoading}
              className="px-3 py-1 border border-ink bg-paper hover:bg-ink hover:text-paper font-mono text-xs uppercase tracking-wider font-bold transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Compiling…' : 'Generate Edition'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-ink">
              <button
                id="btn-pdf-view-folio"
                onClick={() => setPreviewMode('folio')}
                className={`px-2.5 py-1 font-mono text-[11px] font-bold uppercase transition-colors ${
                  previewMode === 'folio' ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-paper-alt'
                }`}
              >
                Folio View
              </button>
              <button
                id="btn-pdf-view-raw"
                onClick={() => setPreviewMode('iframe')}
                className={`px-2.5 py-1 font-mono text-[11px] font-bold uppercase border-l border-ink transition-colors ${
                  previewMode === 'iframe' ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-paper-alt'
                }`}
              >
                Raw PDF
              </button>
            </div>

            {pdfBlobUrl && !isLoading && (
              <button
                id="btn-download-pdf"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1 border-2 border-accent bg-accent text-paper font-mono text-xs uppercase tracking-wider font-bold hover:bg-accent-dark transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Broadsheet PDF</span>
              </button>
            )}
          </div>
        </section>

        {/* Main Broadsheet PDF Preview Stage */}
        <main className="flex-1 bg-paper-alt p-4 sm:p-6 overflow-y-auto flex items-center justify-center relative">
          {isLoading && (
            <div id="pdf-loading-state" className="flex flex-col items-center justify-center text-center p-8 bg-paper border border-ink max-w-md shadow-overlay">
              <div className="w-10 h-10 border-2 border-ink border-t-accent rounded-full animate-spin mb-4" />
              <div className="font-mono text-xs tracking-widest uppercase text-accent font-bold mb-1">
                PRESSES RUNNING
              </div>
              <h3 className="font-serif text-base font-bold text-ink mb-1">
                Generating today's edition…
              </h3>
              <p className="font-serif text-xs text-ink-secondary italic">
                Laying out lead headlines, wire summaries, and editorial rules on 11×17 broadsheet folio.
              </p>
            </div>
          )}

          {!isLoading && hasError && (
            <div id="pdf-error-state" className="flex flex-col items-center justify-center text-center p-8 bg-paper border-2 border-negative max-w-md shadow-overlay">
              <AlertCircle className="w-10 h-10 text-negative mb-3" />
              <div className="font-mono text-xs tracking-widest uppercase text-negative font-bold mb-1">
                PRINT WIRE ERROR
              </div>
              <h3 className="font-serif text-base font-bold text-ink mb-1">
                PDF generation failed.
              </h3>
              <p className="font-serif text-xs text-ink-secondary italic mb-4">
                The composition engine encountered an error while formatting today&apos;s telegraph wire dispatches.
              </p>
              <button
                id="btn-retry-pdf"
                onClick={() => handleGeneratePdf(selectedDate)}
                className="flex items-center gap-1.5 px-4 py-1.5 border border-ink bg-paper hover:bg-ink hover:text-paper font-mono text-xs uppercase font-bold tracking-wider transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Compilation</span>
              </button>
            </div>
          )}

          {!isLoading && !hasError && isEmpty && (
            <div id="pdf-empty-state" className="flex flex-col items-center justify-center text-center p-8 bg-paper border border-paper-border max-w-md shadow-overlay">
              <FileText className="w-10 h-10 text-ink-muted mb-3" />
              <div className="font-mono text-xs tracking-widest uppercase text-ink-muted font-bold mb-1">
                NO DISPATCHES RECORDED
              </div>
              <h3 className="font-serif text-base font-bold text-ink mb-1">
                No articles for this date.
              </h3>
              <p className="font-serif text-xs text-ink-secondary italic mb-4">
                Choose another calendar date to generate and inspect historical newspaper folios.
              </p>
              <button
                onClick={() => {
                  setSelectedDate(todayStr);
                  handleGeneratePdf(todayStr);
                }}
                className="px-3 py-1 border border-ink bg-paper hover:bg-ink hover:text-paper font-mono text-xs uppercase tracking-wider font-bold transition-colors"
              >
                Reset to Today
              </button>
            </div>
          )}

          {!isLoading && !hasError && !isEmpty && (
            <div className="w-full max-w-4xl min-h-[580px] border-2 border-ink bg-paper shadow-overlay overflow-hidden flex flex-col">
              {previewMode === 'folio' ? (
                /* Authentic 1920s Broadsheet Newspaper Page Preview */
                <div id="broadsheet-folio-page" className="p-8 flex flex-col flex-1 bg-paper text-ink select-text">
                  {/* Top Broadsheet Masthead */}
                  <div className="border-b-4 border-ink pb-3 mb-2 text-center">
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-ink-secondary mb-1">
                      <span>VOL. CXXIV • NO. 42</span>
                      <span>INTERNATIONAL TELEGRAPH EDITION</span>
                      <span>WEATHER: CLEAR • 68°F</span>
                    </div>

                    <h1 className="font-masthead text-4xl sm:text-5xl font-black uppercase tracking-tight text-ink">
                      The World Desk
                    </h1>

                    <div className="flex items-center justify-between text-xs font-serif italic text-ink-secondary mt-1 border-t border-paper-border pt-1">
                      <span>Published Daily by Autonomous Telegraph Bureaus</span>
                      <span className="font-bold not-italic">{formattedDate}</span>
                      <span>Price: Two Cents</span>
                    </div>
                  </div>

                  {/* Top Double Rule */}
                  <div className="border-b border-ink mb-6" />

                  {/* Lead Story Headline & 2-Column Split */}
                  {leadStory && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-accent text-paper font-mono text-[10px] font-bold uppercase tracking-wider">
                          LEAD DISPATCH
                        </span>
                        <span className="font-mono text-xs text-ink-secondary uppercase">
                          {leadStory.source?.name} • {leadStory.source?.country}
                        </span>
                      </div>

                      <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ink leading-tight mb-3">
                        {leadStory.title_english}
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-serif leading-relaxed text-ink border-b-2 border-ink pb-6">
                        <p>
                          <span className="float-left text-4xl font-masthead font-bold pr-2 leading-none text-ink">
                            {leadStory.title_english.charAt(0)}
                          </span>
                          {leadStory.summary ||
                            'Dispatches received via high-frequency telegraph wire describe ongoing negotiations and developments shaping the international diplomatic landscape.'}
                        </p>
                        <p className="text-ink-secondary italic border-l border-paper-border pl-4">
                          "Autonomous editorial bureaus operating across four continents confirmed rapid consensus among monitoring stations, ensuring verified intelligence reaches international readers."
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Secondary Columns Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 text-xs font-serif">
                    {secondaryStories.map((story, i) => (
                      <div
                        key={story.id || i}
                        className={`flex flex-col ${i < secondaryStories.length - 1 ? 'md:border-r border-paper-border md:pr-4' : ''}`}
                      >
                        <div className="font-mono text-[10px] text-accent font-bold tracking-wider uppercase mb-1">
                          WIRE {i + 1} • {story.source?.country || 'GLOBAL'}
                        </div>
                        <h4 className="font-serif text-sm font-bold text-ink leading-snug mb-1">
                          {story.title_english}
                        </h4>
                        <p className="text-ink-secondary leading-relaxed line-clamp-4">
                          {story.summary || 'Summary compiled from real-time newsfeed wires.'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Broadsheet Page Bottom Rule */}
                  <div className="mt-8 pt-2 border-t border-ink flex items-center justify-between font-mono text-[10px] text-ink-muted">
                    <span>THE WORLD DESK • COMPILATION RUN: {selectedDate}</span>
                    <span>PAGE 1 • CONTINUED ON FOLIO 2</span>
                  </div>
                </div>
              ) : (
                /* Raw PDF Iframe */
                <iframe
                  id="pdf-preview-iframe"
                  src={pdfBlobUrl || undefined}
                  title="Daily Broadsheet PDF Preview"
                  className="w-full flex-1 min-h-[580px] border-none bg-paper"
                />
              )}
            </div>
          )}
        </main>

        {/* Broadsheet Print Folio Footer */}
        <footer className="px-6 py-2.5 border-t border-paper-border bg-paper flex items-center justify-between text-[11px] font-mono text-ink-muted select-none">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-positive inline-block" />
            <span>PRESS: Autonomous Broadsheet Formatter • 300 DPI Vector Typography • PDF/X Compliant</span>
          </div>
          <div>
            <span>EDITION: {selectedDate} • FOLIO 1 OF 1</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DailyPdfDesk;
