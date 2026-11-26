/**
 * frontend/src/components/bindery/BroadsideBinderyDrawer.tsx
 * Phase I: Broadside Bindery & Physical Artifacts (Features 36-42)
 * Printshop desk for Broadsheet PDF, Rubber Stamps & Redactions, Press Audio,
 * Customizable Masthead Studio, Paper Patina Engine, Ex-Libris Bookplates, and Daily Crossword.
 */
import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Stamp,
  Volume2,
  Type,
  Sliders,
  BookMarked,
  Grid3X3,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Save,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { Article } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { playMechanicalPressClack, playRubberStampThud } from '../../utils/sound';
import { toast } from 'sonner';

export type BinderyTab =
  | 'pdf'
  | 'stamps'
  | 'press_audio'
  | 'masthead'
  | 'patina'
  | 'bookplate'
  | 'crossword';

interface BroadsideBinderyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeArticle: Article | null;
  initialTab?: BinderyTab;
}

const STAMP_PALETTE = [
  { label: 'DECLASSIFIED', color: '#C0392B' },
  { label: 'CONFIDENTIAL', color: '#1A1208' },
  { label: 'VERIFIED CABLE', color: '#1D6B38' },
  { label: 'SPECULATIVE', color: '#7D6608' },
  { label: 'NOFORN', color: '#922B21' },
];

const MASTHEAD_PRESETS = [
  { title: 'The World Desk', motto: 'Global Dispatch & Wire' },
  { title: 'The London Bugle', motto: 'Fleet Street Sovereign Chronicle' },
  { title: 'The Chicago Dispatch', motto: 'Midwest Telegraph & Commerce' },
  { title: 'The Geneva Courier', motto: 'Multilateral Diplomatic Record' },
];

export const BroadsideBinderyDrawer: React.FC<BroadsideBinderyDrawerProps> = ({
  isOpen,
  onClose,
  activeArticle,
  initialTab = 'stamps',
}) => {
  const [activeTab, setActiveTab] = useState<BinderyTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mastheadTitle = useAppStore((s) => s.mastheadTitle);
  const mastheadMotto = useAppStore((s) => s.mastheadMotto);
  const paperPatina = useAppStore((s) => s.paperPatina);
  const pressAudioEnabled = useAppStore((s) => s.pressAudioEnabled);
  const exlibrisInitials = useAppStore((s) => s.exlibrisInitials);
  const exlibrisMotto = useAppStore((s) => s.exlibrisMotto);
  const updateBinderyPreferences = useAppStore((s) => s.updateBinderyPreferences);
  const fetchBinderyPreferences = useAppStore((s) => s.fetchBinderyPreferences);

  // Tab #36: PDF State
  const [pageSize, setPageSize] = useState<'A4' | 'LETTER'>('A4');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Tab #37: Stamps & Redactions
  const [stamps, setStamps] = useState<Array<{ id: string; label: string; color: string; xPct: number; yPct: number; rotation: number }>>([]);
  const [redactions, setRedactions] = useState<Array<{ id: string; xPct: number; yPct: number; widthPct: number; heightPct: number }>>([]);
  const [selectedStampLabel, setSelectedStampLabel] = useState(STAMP_PALETTE[0]!);
  const [stampToolMode, setStampToolMode] = useState<'stamp' | 'redact'>('stamp');

  // Tab #39/#40/#41 Local Drafts
  const [draftTitle, setDraftTitle] = useState(mastheadTitle);
  const [draftMotto, setDraftMotto] = useState(mastheadMotto);
  const [draftInitials, setDraftInitials] = useState(exlibrisInitials);
  const [draftExMotto, setDraftExMotto] = useState(exlibrisMotto);

  // Tab #42: Daily Crossword
  const [crossword, setCrossword] = useState<any | null>(null);
  const [userGrid, setUserGrid] = useState<Record<string, string>>({});
  const [checkedStatus, setCheckedStatus] = useState<'idle' | 'checked'>('idle');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setDraftTitle(mastheadTitle);
    setDraftMotto(mastheadMotto);
    setDraftInitials(exlibrisInitials);
    setDraftExMotto(exlibrisMotto);
  }, [mastheadTitle, mastheadMotto, exlibrisInitials, exlibrisMotto]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    fetchBinderyPreferences();
    loadTab(activeTab);
  }, [isOpen, activeTab, activeArticle?.id]);

  const loadTab = async (tab: BinderyTab) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'stamps' && activeArticle?.id) {
        const res = await api.getArticleStamps(activeArticle.id);
        setStamps(res.stamps);
        setRedactions(res.redactions);
      } else if (tab === 'crossword') {
        const res = await api.getDailyCrossword();
        setCrossword(res);
      }
    } catch (err: any) {
      setError(err?.message || 'Bindery pressroom connection interrupted.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBroadsheetPdf = async () => {
    triggerHaptic('bookmark');
    playMechanicalPressClack(pressAudioEnabled);
    setLoading(true);
    setError(null);
    try {
      const blob = await api.generateBroadsheetPdf({
        articleId: activeArticle?.id,
        pageSize,
        mastheadTitle,
        mastheadMotto,
      });
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      toast.success(`Compiled ${pageSize} broadsheet folio PDF.`);
    } catch {
      setError('Failed to compile printable broadsheet PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    if (stampToolMode === 'stamp') {
      playRubberStampThud(pressAudioEnabled);
      triggerHaptic('bookmark');
      const rotation = -14 + Math.round(Math.random() * 24);
      setStamps((prev) => [
        ...prev,
        {
          id: `st-${Date.now()}`,
          label: selectedStampLabel.label,
          color: selectedStampLabel.color,
          xPct: Math.max(8, Math.min(82, xPct)),
          yPct: Math.max(8, Math.min(85, yPct)),
          rotation,
        },
      ]);
    } else {
      playMechanicalPressClack(pressAudioEnabled);
      triggerHaptic('selection');
      setRedactions((prev) => [
        ...prev,
        {
          id: `rd-${Date.now()}`,
          xPct: Math.max(2, Math.min(72, xPct - 10)),
          yPct: Math.max(2, Math.min(90, yPct - 3)),
          widthPct: 26,
          heightPct: 7,
        },
      ]);
    }
  };

  const handleSaveStamps = async () => {
    if (!activeArticle?.id) return;
    playMechanicalPressClack(pressAudioEnabled);
    triggerHaptic('bookmark');
    try {
      await api.saveArticleStamps(activeArticle.id, stamps, redactions);
      toast.success('Rubber stamps and redactions inked to archive.');
    } catch {
      toast.error('Failed to persist rubber stamps.');
    }
  };

  const handleCrosswordCellChange = (r: number, c: number, value: string) => {
    const letter = value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
    playMechanicalPressClack(pressAudioEnabled);
    setCheckedStatus('idle');
    setUserGrid((prev) => ({
      ...prev,
      [`${r}-${c}`]: letter,
    }));
  };

  const handleRevealCrosswordHint = () => {
    if (!crossword?.grid) return;
    triggerHaptic('selection');
    playMechanicalPressClack(pressAudioEnabled);
    for (let r = 0; r < crossword.gridSize; r++) {
      for (let c = 0; c < crossword.gridSize; c++) {
        const target = crossword.grid[r]?.[c]?.char;
        if (target && userGrid[`${r}-${c}`] !== target) {
          setUserGrid((prev) => ({ ...prev, [`${r}-${c}`]: target }));
          return;
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="bindery-desk-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bindery-desk-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col w-full max-w-5xl h-[92vh] max-h-[860px] bg-[var(--color-paper)] border-2 border-[var(--color-ink)] shadow-overlay overflow-hidden rounded-xs text-[var(--color-ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Broadside Bindery Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-[var(--color-paper-alt)] border-b-2 border-[var(--color-ink)] shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-0.5 text-[10px] sm:text-xs font-mono uppercase tracking-widest font-bold shrink-0">
              Broadside Bindery
            </span>
            <h2 id="bindery-desk-title" className="text-base sm:text-xl font-serif font-black tracking-tight truncate">
              PRINT SHOP, ARTIFACTS &amp; PRESSROOM
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onClose();
            }}
            aria-label="Close Broadside Bindery"
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-border)]/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 7-Tab Navigation Bar */}
        <nav
          aria-label="Bindery Desks"
          data-lenis-prevent="true"
          className="flex overflow-x-auto no-scrollbar border-b border-[var(--color-paper-border)] bg-[var(--color-paper)] text-xs font-mono uppercase tracking-wider divide-x divide-[var(--color-paper-border)] shrink-0"
        >
          {[
            { id: 'pdf', label: '#36 Broadsheet PDF', icon: Printer },
            { id: 'stamps', label: '#37 Stamps & Redactor', icon: Stamp },
            { id: 'press_audio', label: '#38 Press Audio', icon: Volume2 },
            { id: 'masthead', label: '#39 Masthead Studio', icon: Type },
            { id: 'patina', label: '#40 Paper Patina', icon: Sliders },
            { id: 'bookplate', label: '#41 Ex-Libris Plate', icon: BookMarked },
            { id: 'crossword', label: '#42 Cryptic Crossword', icon: Grid3X3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  playMechanicalPressClack(pressAudioEnabled);
                  setActiveTab(tab.id as BinderyTab);
                }}
                className={`flex items-center space-x-1.5 px-3 py-2.5 min-h-[44px] whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]'
                    : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Workspace Body */}
        <div data-lenis-prevent="true" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[var(--color-paper)]">
          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-4 animate-pulse py-6" aria-label="Setting Linotype Press">
              <div className="h-4 w-44 bg-[var(--color-paper-border)] rounded-xs" />
              <div className="h-8 w-2/3 bg-[var(--color-paper-border)] rounded-xs" />
              <div className="h-40 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)]" />
              <p className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-widest">
                Typesetting woodblock plates &amp; binding folio...
              </p>
            </div>
          )}

          {/* Error Banner */}
          {!loading && error && (
            <div className="border-2 border-[var(--color-accent)] bg-[var(--color-paper-alt)] p-5 space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-[var(--color-accent)]">
                <AlertTriangle size={16} />
                <span>[DISPATCH INTERRUPTED: PRESS JAMMED]</span>
              </div>
              <p className="font-serif text-sm">{error}</p>
              <button
                type="button"
                onClick={() => loadTab(activeTab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-ink)] bg-[var(--color-paper)] text-xs font-mono font-bold uppercase cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Reset Print Roller</span>
              </button>
            </div>
          )}

          {/* TAB #36: AUTHENTIC PRINTABLE BROADSHEET PDF GENERATOR */}
          {!loading && !error && activeTab === 'pdf' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-paper-border)] pb-3">
                <div>
                  <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                    Feature #36 · Server-Side PDFKit Typesetter
                  </span>
                  <h3 className="text-2xl font-serif font-bold">
                    Authentic Printable Broadsheet PDF Generator
                  </h3>
                  <p className="text-sm text-[var(--color-ink-secondary)]">
                    Compiles a 3-column broadsheet front page with woodblock drop-caps and your customized masthead.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(['A4', 'LETTER'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setPageSize(sz)}
                      className={`px-2.5 py-1.5 text-xs font-mono font-bold border cursor-pointer ${
                        pageSize === sz
                          ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]'
                          : 'bg-[var(--color-paper-alt)] border-[var(--color-paper-border)]'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleGenerateBroadsheetPdf}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--color-accent)] text-white text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Compile Folio PDF</span>
                  </button>
                </div>
              </div>

              <div className="p-5 bg-[var(--color-paper-alt)] border-2 border-[var(--color-ink)] space-y-4">
                <div className="text-center border-b-2 border-[var(--color-ink)] pb-3">
                  <div className="font-masthead text-3xl tracking-tight">{mastheadTitle}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-secondary)]">
                    {mastheadMotto} · {pageSize} FOLIO PROOF
                  </div>
                </div>
                {activeArticle ? (
                  <div className="space-y-2">
                    <h4 className="font-headline text-xl font-bold">{activeArticle.title_english}</h4>
                    <p className="font-serif text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                      <span className="float-left mr-2.5 px-2.5 py-1 bg-[var(--color-ink)] text-[var(--color-paper)] font-headline text-2xl font-bold leading-none">
                        {(activeArticle.summary || 'T').charAt(0).toUpperCase()}
                      </span>
                      {(activeArticle.summary || activeArticle.body_english || '').slice(1, 360)}...
                    </p>
                  </div>
                ) : (
                  <p className="font-serif italic text-sm text-[var(--color-ink-secondary)]">
                    Compiling top breaking dispatches across international bureaus.
                  </p>
                )}

                {pdfUrl && (
                  <div className="pt-3 border-t border-[var(--color-paper-border)] flex items-center justify-between">
                    <span className="font-mono text-xs text-[var(--color-positive)] font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      Ready for Print ({pageSize})
                    </span>
                    <a
                      href={pdfUrl}
                      download={`Broadsheet_${pageSize}.pdf`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-mono font-bold uppercase"
                    >
                      <Download size={13} />
                      <span>Download PDF</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB #37: RUBBER STAMP & REDACTOR STUDIO */}
          {!loading && !error && activeTab === 'stamps' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-paper-border)] pb-3">
                <div>
                  <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                    Feature #37 · Archival Annotation &amp; Sanitization
                  </span>
                  <h3 className="text-2xl font-serif font-bold">
                    Rubber Stamp &amp; Black-Marker Redactor Studio
                  </h3>
                  <p className="text-sm text-[var(--color-ink-secondary)]">
                    Click anywhere on the broadsheet proof sheet below to apply an ink stamp or redact sensitive clauses.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStampToolMode('stamp')}
                    className={`px-2.5 py-1.5 text-xs font-mono font-bold uppercase border cursor-pointer ${
                      stampToolMode === 'stamp'
                        ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]'
                        : 'bg-[var(--color-paper-alt)] border-[var(--color-paper-border)]'
                    }`}
                  >
                    Rubber Stamp Tool
                  </button>
                  <button
                    type="button"
                    onClick={() => setStampToolMode('redact')}
                    className={`px-2.5 py-1.5 text-xs font-mono font-bold uppercase border cursor-pointer ${
                      stampToolMode === 'redact'
                        ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]'
                        : 'bg-[var(--color-paper-alt)] border-[var(--color-paper-border)]'
                    }`}
                  >
                    Black Marker Redact
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStamps([]);
                      setRedactions([]);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[var(--color-paper-border)] text-xs font-mono uppercase cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Clear</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveStamps}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--color-accent)] text-white text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    <Save size={12} />
                    <span>Ink to Archive</span>
                  </button>
                </div>
              </div>

              {/* Stamp Selection Palette */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase text-[var(--color-ink-muted)] font-bold">
                  Active Ink Seal:
                </span>
                {STAMP_PALETTE.map((st) => (
                  <button
                    key={st.label}
                    type="button"
                    onClick={() => {
                      setStampToolMode('stamp');
                      setSelectedStampLabel(st);
                    }}
                    className={`px-2.5 py-1 font-mono text-[11px] font-black uppercase border-2 cursor-pointer transition-transform ${
                      selectedStampLabel.label === st.label && stampToolMode === 'stamp'
                        ? 'scale-105 shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: st.color,
                      color: st.color,
                      backgroundColor: 'var(--color-paper)',
                    }}
                  >
                    [{st.label}]
                  </button>
                ))}
              </div>

              {/* Interactive Proof Sheet Canvas */}
              {!activeArticle ? (
                <div className="p-8 border border-dashed border-[var(--color-paper-border)] text-center font-serif italic text-[var(--color-ink-secondary)]">
                  Select a dispatch from the Reader Desk to apply rubber stamps and redactions.
                </div>
              ) : (
                <div
                  id="stamp-redactor-proof-canvas"
                  onClick={handleCanvasClick}
                  className="relative min-h-[280px] p-6 bg-[var(--color-paper-alt)] border-2 border-[var(--color-ink)] cursor-crosshair select-none overflow-hidden"
                >
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-2 border-b border-[var(--color-paper-border)] pb-1">
                    WIRE PROOF · {activeArticle.source?.name} · CLICK ANYWHERE TO {stampToolMode === 'stamp' ? 'STAMP' : 'REDACT'}
                  </div>
                  <h4 className="font-headline text-2xl font-bold mb-3">{activeArticle.title_english}</h4>
                  <p className="font-serif text-sm leading-relaxed text-[var(--color-ink-secondary)] max-w-3xl">
                    {activeArticle.summary || activeArticle.body_english?.slice(0, 520)}
                  </p>

                  {/* Rendered Redaction Bars */}
                  {redactions.map((rd) => (
                    <div
                      key={rd.id}
                      className="absolute bg-[#0E0C09] opacity-95 pointer-events-none"
                      style={{
                        left: `${rd.xPct}%`,
                        top: `${rd.yPct}%`,
                        width: `${rd.widthPct}%`,
                        height: `${rd.heightPct}%`,
                      }}
                    />
                  ))}

                  {/* Rendered Distressed Rubber Stamps */}
                  {stamps.map((st) => (
                    <div
                      key={st.id}
                      className="absolute px-3 py-1 border-4 font-mono text-sm sm:text-base font-black uppercase tracking-widest pointer-events-none opacity-85"
                      style={{
                        left: `${st.xPct}%`,
                        top: `${st.yPct}%`,
                        borderColor: st.color,
                        color: st.color,
                        transform: `translate(-50%, -50%) rotate(${st.rotation}deg)`,
                      }}
                    >
                      {st.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB #38: MECHANICAL PRINTING PRESS SOUND & HAPTICS */}
          {!loading && !error && activeTab === 'press_audio' && (
            <div className="space-y-5">
              <div className="border-b border-[var(--color-paper-border)] pb-3">
                <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                  Feature #38 · Tactile Printshop Feedback
                </span>
                <h3 className="text-2xl font-serif font-bold">
                  Mechanical Printing Press Audio &amp; Haptics
                </h3>
                <p className="text-sm text-[var(--color-ink-secondary)]">
                  Synthesizes authentic cast-iron platen clicks, ink-stamp thuds, and haptic device vibrations via Web Audio.
                </p>
              </div>

              <div className="p-5 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-serif font-bold text-lg">Pressroom Acoustic &amp; Haptic Engine</div>
                    <div className="font-mono text-xs text-[var(--color-ink-secondary)]">
                      Fires synchronized tactile clicks on bookmarks, stamps, and crossword typing.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !pressAudioEnabled;
                      updateBinderyPreferences({ press_audio_enabled: next });
                      if (next) playMechanicalPressClack(true);
                    }}
                    className={`px-4 py-2 font-mono text-xs font-bold uppercase border cursor-pointer ${
                      pressAudioEnabled
                        ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]'
                        : 'bg-[var(--color-paper)] text-[var(--color-ink-secondary)] border-[var(--color-paper-border)]'
                    }`}
                  >
                    {pressAudioEnabled ? 'PRESS AUDIO: ACTIVE' : 'PRESS AUDIO: MUTED'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[var(--color-paper-border)]">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      playMechanicalPressClack(true);
                    }}
                    className="p-3 border border-[var(--color-ink)] bg-[var(--color-paper)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
                  >
                    Test Platen Clack
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('bookmark');
                      playRubberStampThud(true);
                    }}
                    className="p-3 border border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-paper)] hover:bg-[var(--color-accent)] hover:text-white text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
                  >
                    Test Ink Stamp Thud
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerHaptic('refresh')}
                    className="p-3 border border-[var(--color-paper-border)] bg-[var(--color-paper)] text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    Test Telegraph Haptic
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB #39: CUSTOMIZABLE MASTHEAD TYPOGRAPHY STUDIO */}
          {!loading && !error && activeTab === 'masthead' && (
            <div className="space-y-5">
              <div className="border-b border-[var(--color-paper-border)] pb-3">
                <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                  Feature #39 · Newspaper Identity Studio
                </span>
                <h3 className="text-2xl font-serif font-bold">
                  Customizable Broadsheet Masthead &amp; Motto
                </h3>
                <p className="text-sm text-[var(--color-ink-secondary)]">
                  Rebrand the top newspaper nameplate across your reading desk and printable broadsheet PDFs.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {MASTHEAD_PRESETS.map((p) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => {
                      setDraftTitle(p.title);
                      setDraftMotto(p.motto);
                      updateBinderyPreferences({ masthead_title: p.title, masthead_motto: p.motto });
                      playMechanicalPressClack(pressAudioEnabled);
                    }}
                    className="px-3 py-1.5 border border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] hover:border-[var(--color-ink)] text-xs font-serif font-bold cursor-pointer"
                  >
                    {p.title}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--color-paper-alt)] p-4 border border-[var(--color-paper-border)]">
                <label className="block space-y-1">
                  <span className="font-mono text-[10px] uppercase font-bold text-[var(--color-ink-secondary)]">
                    Broadsheet Masthead Title
                  </span>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-ink)] bg-[var(--color-paper)] font-serif text-base font-bold"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-mono text-[10px] uppercase font-bold text-[var(--color-ink-secondary)]">
                    Subtitle / Latin Motto
                  </span>
                  <input
                    type="text"
                    value={draftMotto}
                    onChange={(e) => setDraftMotto(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-ink)] bg-[var(--color-paper)] font-mono text-xs"
                  />
                </label>

                <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-[var(--color-paper-border)]">
                  <div className="font-masthead text-2xl">{draftTitle || 'The World Desk'}</div>
                  <button
                    type="button"
                    onClick={() => {
                      playMechanicalPressClack(pressAudioEnabled);
                      updateBinderyPreferences({ masthead_title: draftTitle, masthead_motto: draftMotto });
                      toast.success(`Masthead updated to "${draftTitle}"`);
                    }}
                    className="px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    Apply Masthead Identity
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB #40: PAPER AGING & PATINA ENGINE */}
          {!loading && !error && activeTab === 'patina' && (
            <div className="space-y-5">
              <div className="border-b border-[var(--color-paper-border)] pb-3">
                <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                  Feature #40 · Archival Cellulose Shader
                </span>
                <h3 className="text-2xl font-serif font-bold">
                  Paper Aging &amp; Sepia Patina Engine
                </h3>
                <p className="text-sm text-[var(--color-ink-secondary)]">
                  Tune rag-paper sepia warmth and antique corner vignetting from crisp modern print to 1890s archive parchment.
                </p>
              </div>

              <div className="p-5 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] space-y-4">
                <div className="flex items-center justify-between font-mono text-xs font-bold">
                  <span>PATINA INTENSITY: {paperPatina}%</span>
                  <span className="text-[var(--color-accent)]">
                    {paperPatina < 25 ? 'Fresh Print (2026)' : paperPatina < 65 ? '1920s Broadsheet' : '1890s Rag Parchment'}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={paperPatina}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    useAppStore.setState({ paperPatina: val });
                    updateBinderyPreferences({ paper_patina: val });
                  }}
                  aria-label="Paper Patina Slider"
                  className="w-full accent-[var(--color-accent)] cursor-pointer"
                />

                <div
                  className="p-5 border-2 border-[var(--color-ink)] bg-[#FAF7F0] text-[#1A1208] transition-all"
                  style={{ filter: `sepia(${(paperPatina * 0.42).toFixed(0)}%) contrast(${100 + Math.round(paperPatina * 0.05)}%)` }}
                >
                  <div className="font-masthead text-2xl mb-1">{mastheadTitle}</div>
                  <p className="font-serif text-sm leading-relaxed">
                    Live paper-stock swatch preview. Adjusting the patina engine imparts subtle archival warmth and rag grain without sacrificing ink contrast.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB #41: EX-LIBRIS BOOKPLATE BOOKMARKS */}
          {!loading && !error && activeTab === 'bookplate' && (
            <div className="space-y-5">
              <div className="border-b border-[var(--color-paper-border)] pb-3">
                <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                  Feature #41 · Heraldic Collector Stamp
                </span>
                <h3 className="text-2xl font-serif font-bold">
                  Ex-Libris Bookplate Engraver
                </h3>
                <p className="text-sm text-[var(--color-ink-secondary)]">
                  Engraves a custom heraldic bookplate bearing your initials and the Daily Bugle bat crest.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-5 flex flex-col items-center p-4 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] space-y-3">
                  <img
                    src={api.getBookplateSvgUrl(draftInitials || 'W.D.', draftExMotto || 'VERITAS', mastheadTitle)}
                    alt="Ex Libris Heraldic Bookplate"
                    className="w-56 h-auto border border-[var(--color-ink)] shadow-sm"
                  />
                  <a
                    href={api.getBookplateSvgUrl(draftInitials || 'W.D.', draftExMotto || 'VERITAS', mastheadTitle)}
                    download={`ExLibris_${(draftInitials || 'WD').replace(/[^a-zA-Z0-9]/g, '')}.svg`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-mono font-bold uppercase"
                  >
                    <Download size={13} />
                    <span>Download Engraved SVG</span>
                  </a>
                </div>

                <div className="md:col-span-7 space-y-4 bg-[var(--color-paper-alt)] p-4 border border-[var(--color-paper-border)]">
                  <label className="block space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold text-[var(--color-ink-secondary)]">
                      Owner Initials / Monogram
                    </span>
                    <input
                      type="text"
                      maxLength={8}
                      value={draftInitials}
                      onChange={(e) => setDraftInitials(e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--color-ink)] bg-[var(--color-paper)] font-serif text-lg font-bold"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold text-[var(--color-ink-secondary)]">
                      Engraved Motto
                    </span>
                    <input
                      type="text"
                      maxLength={64}
                      value={draftExMotto}
                      onChange={(e) => setDraftExMotto(e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--color-ink)] bg-[var(--color-paper)] font-mono text-xs"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      playRubberStampThud(pressAudioEnabled);
                      updateBinderyPreferences({ exlibris_initials: draftInitials, exlibris_motto: draftExMotto });
                      toast.success('Ex-Libris plate saved to bindery ledger.');
                    }}
                    className="px-4 py-2 bg-[var(--color-accent)] text-white text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    Save Engraved Plate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB #42: DAILY CRYPTIC CROSSWORD & EDITORIAL ACROSTIC */}
          {!loading && !error && activeTab === 'crossword' && crossword && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-paper-border)] pb-3">
                <div>
                  <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                    Feature #42 · Newsroom Puzzle Desk
                  </span>
                  <h3 className="text-2xl font-serif font-bold">{crossword.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRevealCrosswordHint}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    <Sparkles size={12} />
                    <span>Reveal Letter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playMechanicalPressClack(pressAudioEnabled);
                      setCheckedStatus('checked');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    <CheckCircle2 size={12} />
                    <span>Verify Grid</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Interactive 9x9 Crossword Matrix */}
                <div className="lg:col-span-6 flex justify-center">
                  <div
                    className="grid gap-0.5 p-2 bg-[#1A1208] border-2 border-[#1A1208]"
                    style={{ gridTemplateColumns: `repeat(${crossword.gridSize}, minmax(30px, 38px))` }}
                  >
                    {crossword.grid.map((row: any[], rIdx: number) =>
                      row.map((cell, cIdx) => {
                        const isBlocked = cell.char === null;
                        const val = userGrid[`${rIdx}-${cIdx}`] || '';
                        const isCorrect = checkedStatus === 'checked' && val === cell.char;
                        const isWrong = checkedStatus === 'checked' && val !== '' && val !== cell.char;
                        return (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            className={`relative aspect-square ${
                              isBlocked ? 'bg-[#1A1208]' : 'bg-[#FAF7F0]'
                            }`}
                          >
                            {!isBlocked && (
                              <>
                                {cell.number && (
                                  <span className="absolute top-0.5 left-0.5 font-mono text-[8px] font-bold text-[#5C4E3A] leading-none pointer-events-none">
                                    {cell.number}
                                  </span>
                                )}
                                <input
                                  type="text"
                                  maxLength={1}
                                  value={val}
                                  onChange={(e) => handleCrosswordCellChange(rIdx, cIdx, e.target.value)}
                                  aria-label={`Row ${rIdx + 1} Column ${cIdx + 1}`}
                                  className={`w-full h-full text-center font-mono text-sm font-black uppercase bg-transparent focus:outline-none focus:bg-[#E8A79F]/30 ${
                                    isCorrect
                                      ? 'text-[#1D6B38]'
                                      : isWrong
                                        ? 'text-[#C0392B]'
                                        : 'text-[#1A1208]'
                                  }`}
                                />
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Across & Down Clues */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="p-3.5 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] space-y-2">
                    <h4 className="font-mono text-xs font-bold uppercase border-b border-[var(--color-paper-border)] pb-1">
                      ACROSS CLUES
                    </h4>
                    {crossword.clues.across.map((c: any) => (
                      <div key={`a-${c.number}`} className="font-serif text-xs leading-snug">
                        <strong className="font-mono">{c.number}.</strong> {c.clue}
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] space-y-2">
                    <h4 className="font-mono text-xs font-bold uppercase border-b border-[var(--color-paper-border)] pb-1">
                      DOWN CLUES
                    </h4>
                    {crossword.clues.down.map((c: any) => (
                      <div key={`d-${c.number}`} className="font-serif text-xs leading-snug">
                        <strong className="font-mono">{c.number}.</strong> {c.clue}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-4 py-2 border-t border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-[var(--color-ink-secondary)] shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-positive)]" />
            <span>BINDERY PRESS: ARMED</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline">Esc: Close</span>
            <span>Shortcut: Y</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default BroadsideBinderyDrawer;
