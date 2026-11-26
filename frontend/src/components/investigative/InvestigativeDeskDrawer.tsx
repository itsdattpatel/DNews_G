import React, { useState, useEffect } from 'react';
import { 
  Clock, GitCompare, Building, Eye, CheckCircle2, 
  FolderLock, AlertTriangle, RefreshCw, X,
  Upload, Sparkles, Search, ShieldAlert, FileSearch
} from 'lucide-react';
import { api } from '../../lib/api';
import { triggerHaptic } from '../../lib/haptics';
import type { Article } from '../../types';

export type InvestigativeTab = 
  | 'drop' 
  | 'timeline' 
  | 'contradiction' 
  | 'ownership' 
  | 'satellite' 
  | 'quotes' 
  | 'foia' 
  | 'sanctions' 
  | 'clickbait' 
  | 'revisions';

interface InvestigativeDeskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeArticle?: Article | null;
  initialTab?: InvestigativeTab;
}

export const InvestigativeDeskDrawer: React.FC<InvestigativeDeskDrawerProps> = ({
  isOpen,
  onClose,
  activeArticle,
  initialTab = 'timeline',
}) => {
  const [activeTab, setActiveTab] = useState<InvestigativeTab>(initialTab);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Feature #1: Whistleblower Drop State
  const [dropResult, setDropResult] = useState<any | null>(null);

  // Feature #2: Timeline State
  const [timelineData, setTimelineData] = useState<any | null>(null);

  // Feature #3: Contradiction State
  const [claimA, setClaimA] = useState<string>('');
  const [claimB, setClaimB] = useState<string>('');
  const [sourceA, setSourceA] = useState<string>('Outlet A');
  const [sourceB, setSourceB] = useState<string>('Outlet B');
  const [compareResult, setCompareResult] = useState<any | null>(null);

  // Feature #4: Corporate Ownership State
  const [entityQuery, setEntityQuery] = useState<string>('The Washington Post');
  const [ownershipData, setOwnershipData] = useState<any | null>(null);

  // Feature #5: Satellite OSINT State
  const [satelliteData, setSatelliteData] = useState<any | null>(null);
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  // Feature #6: Quote Authenticator State
  const [quoteInput, setQuoteInput] = useState<string>('');
  const [speakerInput, setSpeakerInput] = useState<string>('');
  const [quoteResult, setQuoteResult] = useState<any | null>(null);

  // Feature #7: FOIA Docket State
  const [foiaRequests, setFoiaRequests] = useState<any[]>([]);
  const [newAgency, setNewAgency] = useState<string>('');
  const [newSubject, setNewSubject] = useState<string>('');

  // Feature #8: Sanctions Screener State
  const [sanctionQuery, setSanctionQuery] = useState<string>('');
  const [sanctionMatches, setSanctionMatches] = useState<any[]>([]);
  const [sanctionSearched, setSanctionSearched] = useState<boolean>(false);

  // Feature #9: Clickbait Redactor State
  const [clickbaitInput, setClickbaitInput] = useState<string>('');
  const [clickbaitResult, setClickbaitResult] = useState<any | null>(null);

  // Feature #10: Revisions State
  const [revisionData, setRevisionData] = useState<any | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (activeArticle) {
      setClaimA(activeArticle.title_english || '');
      setEntityQuery(activeArticle.source?.name || 'The Washington Post');
      setClickbaitInput(activeArticle.title_original || activeArticle.title_english || '');
      setQuoteInput(activeArticle.summary ? activeArticle.summary.slice(0, 120) : '');
      setSpeakerInput(activeArticle.source?.name || 'Spokesperson');

      // Auto-fetch timeline & revisions for active article
      if (activeTab === 'timeline') {
        fetchTimeline(activeArticle.id);
      } else if (activeTab === 'revisions') {
        fetchRevisions(activeArticle.id);
      }
    }
  }, [activeArticle, activeTab]);

  const fetchTimeline = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getArticleTimeline(id);
      setTimelineData(data);
    } catch (err: any) {
      setError('Unable to parse chronological markers from wire.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevisions = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getArticleRevisions(id);
      setRevisionData(data);
    } catch (err: any) {
      setError('Unable to fetch revision snapshots.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: InvestigativeTab) => {
    triggerHaptic('selection');
    setActiveTab(tab);
    setError(null);

    if (tab === 'timeline' && activeArticle) {
      fetchTimeline(activeArticle.id);
    } else if (tab === 'revisions' && activeArticle) {
      fetchRevisions(activeArticle.id);
    } else if (tab === 'satellite' && !satelliteData) {
      api.getSatelliteOsint().then(setSatelliteData).catch(() => {});
    } else if (tab === 'foia' && foiaRequests.length === 0) {
      api.getFoiaRequests().then(res => setFoiaRequests(res.requests)).catch(() => {});
    } else if (tab === 'ownership' && !ownershipData) {
      api.getCorporateOwnership(entityQuery).then(setOwnershipData).catch(() => {});
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const res = await api.scrubDocument(file.name, base64, file.type);
        setDropResult(res);
        triggerHaptic('bookmark');
      } catch (err: any) {
        setError('Document scrubbing failed: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCrossCompare = async () => {
    if (!claimA || !claimB) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.crossCompareClaims(claimA, claimB, sourceA, sourceB);
      setCompareResult(res);
      triggerHaptic('selection');
    } catch (err: any) {
      setError('Contradiction analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnershipLookup = async () => {
    if (!entityQuery) return;
    setLoading(true);
    try {
      const res = await api.getCorporateOwnership(entityQuery);
      setOwnershipData(res);
      triggerHaptic('selection');
    } catch {
      setError('Ownership record query failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyQuote = async () => {
    if (!quoteInput) return;
    setLoading(true);
    try {
      const res = await api.verifyQuote(quoteInput, speakerInput);
      setQuoteResult(res);
      triggerHaptic('selection');
    } catch {
      setError('Quote verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFoia = async () => {
    if (!newAgency || !newSubject) return;
    setLoading(true);
    try {
      await api.createFoiaRequest(newAgency, newSubject);
      const updated = await api.getFoiaRequests();
      setFoiaRequests(updated.requests);
      setNewAgency('');
      setNewSubject('');
      triggerHaptic('bookmark');
    } catch {
      setError('Failed to log FOIA request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSanctionsScreen = async () => {
    if (!sanctionQuery) return;
    setLoading(true);
    setSanctionSearched(true);
    try {
      const res = await api.screenSanctions(sanctionQuery);
      setSanctionMatches(res.matches);
      triggerHaptic('selection');
    } catch {
      setError('Sanctions screening check failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDesensationalize = async () => {
    if (!clickbaitInput) return;
    setLoading(true);
    try {
      const res = await api.desensationalizeHeadline(clickbaitInput);
      setClickbaitResult(res);
      triggerHaptic('selection');
    } catch {
      setError('Clickbait neutralization failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeSnapshot = async () => {
    if (!activeArticle) return;
    setLoading(true);
    try {
      await api.createArticleSnapshot(activeArticle.id);
      await fetchRevisions(activeArticle.id);
      triggerHaptic('bookmark');
    } catch {
      setError('Failed to record article revision snapshot.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-label="Investigative & Verification Desk"
    >
      <div 
        className="w-full sm:w-[540px] h-full bg-[var(--color-paper)] text-[var(--color-ink)] border-l border-[var(--color-paper-border)] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded border border-[var(--color-paper-border)] flex items-center justify-center bg-[var(--color-paper)]">
              <ShieldAlert className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-[var(--color-ink)]">
                Investigative & Verification Desk
              </h2>
              <p className="text-[11px] font-mono text-[var(--color-ink-muted)]">
                Bureau of Fact-Checking, OSINT & Document Provenance
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('selection');
              onClose();
            }}
            className="p-1.5 rounded hover:bg-[var(--color-paper-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
            title="Close Desk"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Ribbon (Hairpin-Segmented Glide) */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-2 bg-[var(--color-paper-alt)] border-b border-[var(--color-paper-border)] text-xs font-serif shrink-0">
          {[
            { id: 'timeline', label: 'Timeline', icon: Clock },
            { id: 'contradiction', label: 'Contradict', icon: GitCompare },
            { id: 'ownership', label: 'Ownership', icon: Building },
            { id: 'satellite', label: 'Satellite', icon: Eye },
            { id: 'quotes', label: 'Quotes', icon: CheckCircle2 },
            { id: 'drop', label: 'Whistleblower', icon: FolderLock },
            { id: 'foia', label: 'FOIA Docket', icon: FileSearch },
            { id: 'sanctions', label: 'Sanctions', icon: AlertTriangle },
            { id: 'clickbait', label: 'De-Clickbait', icon: Sparkles },
            { id: 'revisions', label: 'Diffs', icon: RefreshCw },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as InvestigativeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-serif whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)] shadow-sm'
                    : 'bg-[var(--color-paper)] text-[var(--color-ink-secondary)] border-[var(--color-paper-border)] hover:bg-[var(--color-paper-alt)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-600 font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Whistleblower Drop (#1) */}
          {activeTab === 'drop' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-[var(--color-paper-border)] rounded-lg p-6 text-center bg-[var(--color-paper-alt)] hover:border-[var(--color-ink)] transition-colors">
                <FolderLock className="w-8 h-8 mx-auto text-[var(--color-accent)] mb-2" />
                <h3 className="font-serif font-bold text-sm text-[var(--color-ink)]">
                  "Deep Throat" Anonymous Source & Whistleblower Drop
                </h3>
                <p className="text-xs text-[var(--color-ink-secondary)] mt-1 max-w-sm mx-auto font-serif">
                  Air-gapped local inbox. Strips EXIF metadata, camera serial numbers, PDF author tags, and printer tracking machine dots in memory.
                </p>
                <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-serif font-bold rounded cursor-pointer hover:opacity-90">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Select Leaked Document / Image</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>

              {dropResult && (
                <div className="p-4 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-green-700 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded border border-green-600/30">
                      METADATA SCRUBBED: 100%
                    </span>
                    <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
                      {(dropResult.scrubbedSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="text-xs font-serif text-[var(--color-ink)]">
                    <p className="font-bold">Scrubbed Identifiers:</p>
                    <ul className="list-disc list-inside text-xs text-[var(--color-ink-secondary)] mt-1 space-y-0.5 font-mono">
                      {dropResult.scrubbedFields.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-[var(--color-paper-border)] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                      SHA256: {dropResult.documentHash.slice(0, 16)}...
                    </span>
                    <a
                      href={`data:application/octet-stream;base64,${dropResult.cleanBase64}`}
                      download="scrubbed_evidence.bin"
                      className="text-xs font-serif underline text-[var(--color-accent)] font-bold hover:opacity-80"
                    >
                      Download Sanitized File
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Timeline Builder (#2) */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-sm text-[var(--color-ink)]">
                  Chronological Conflict & Event Timeline
                </h3>
                {activeArticle && (
                  <button 
                    onClick={() => fetchTimeline(activeArticle.id)}
                    className="text-xs font-mono text-[var(--color-accent)] flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs font-serif text-[var(--color-ink-muted)] animate-pulse">
                  Extracting chronological indicators across wire dispatches...
                </div>
              ) : timelineData && timelineData.milestones.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--color-paper-border)]">
                  {timelineData.milestones.map((item: any, idx: number) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[var(--color-ink)] border-2 border-[var(--color-paper)]" />
                      <div className="p-3 rounded border border-[var(--color-paper-border)] bg-[var(--color-paper-alt)]">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className="font-bold text-[var(--color-accent)]">{item.timeLabel}</span>
                          <span className="text-[var(--color-ink-muted)]">{item.confidence}% confidence</span>
                        </div>
                        <p className="text-xs font-serif text-[var(--color-ink)] leading-relaxed">
                          {item.event}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-[var(--color-paper-border)] rounded text-xs text-[var(--color-ink-muted)] font-serif">
                  No chronological markers detected in current dispatch.
                </div>
              )}
            </div>
          )}

          {/* 3. Contradiction Matrix (#3) */}
          {activeTab === 'contradiction' && (
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-sm text-[var(--color-ink)]">
                Cross-Wire Contradiction & Stance Matrix
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-serif text-[var(--color-ink-secondary)]">
                    <span>Source A:</span>
                    <input 
                      type="text" 
                      value={sourceA} 
                      onChange={e => setSourceA(e.target.value)}
                      className="text-xs font-mono px-2 py-0.5 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)]"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={claimA}
                    onChange={e => setClaimA(e.target.value)}
                    placeholder="Enter claim statement from Wire A..."
                    className="w-full text-xs font-serif p-2 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)] focus:outline-none focus:border-[var(--color-ink)]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-serif text-[var(--color-ink-secondary)]">
                    <span>Source B:</span>
                    <input 
                      type="text" 
                      value={sourceB} 
                      onChange={e => setSourceB(e.target.value)}
                      className="text-xs font-mono px-2 py-0.5 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)]"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={claimB}
                    onChange={e => setClaimB(e.target.value)}
                    placeholder="Enter claim statement from Wire B..."
                    className="w-full text-xs font-serif p-2 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)] focus:outline-none focus:border-[var(--color-ink)]"
                  />
                </div>

                <button
                  onClick={handleCrossCompare}
                  disabled={loading || !claimA || !claimB}
                  className="w-full py-2 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-serif font-bold rounded hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Evaluating Stance...' : 'Cross-Examine Claims'}
                </button>
              </div>

              {compareResult && (
                <div className="p-3 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                      compareResult.status === 'contradiction'
                        ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300'
                        : compareResult.status === 'differing_estimate'
                        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {compareResult.status.toUpperCase()} (Score: {compareResult.contradictionScore})
                    </span>
                  </div>
                  <p className="text-xs font-serif text-[var(--color-ink)] leading-relaxed">
                    {compareResult.analysis}
                  </p>
                  {compareResult.keyDiscrepancies.length > 0 && (
                    <ul className="list-disc list-inside text-[11px] font-mono text-[var(--color-ink-secondary)] pt-2 border-t border-[var(--color-paper-border)]">
                      {compareResult.keyDiscrepancies.map((d: string, i: number) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. Corporate Ownership (#4) */}
          {activeTab === 'ownership' && (
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-sm text-[var(--color-ink)]">
                Corporate Conglomerate & Media Ownership Graph
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={entityQuery}
                  onChange={e => setEntityQuery(e.target.value)}
                  placeholder="Enter media outlet or corporation name..."
                  className="flex-1 text-xs font-serif p-2 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)]"
                />
                <button
                  onClick={handleOwnershipLookup}
                  className="px-3 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-serif font-bold rounded"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>

              {ownershipData && (
                <div className="p-4 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)] space-y-3">
                  <div className="border-b border-[var(--color-paper-border)] pb-2">
                    <h4 className="font-serif font-bold text-sm text-[var(--color-ink)]">
                      {ownershipData.entityName}
                    </h4>
                    <p className="text-xs font-mono text-[var(--color-accent)] font-bold">
                      Parent: {ownershipData.parentConglomerate}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-serif">
                    <div>
                      <span className="text-[var(--color-ink-muted)] block font-mono text-[10px]">ULTIMATE BENEFICIARY</span>
                      <span className="font-bold">{ownershipData.ultimateOwner}</span>
                    </div>
                    <div>
                      <span className="text-[var(--color-ink-muted)] block font-mono text-[10px]">POLITICAL LEAN</span>
                      <span className="font-bold">{ownershipData.politicalLean}</span>
                    </div>
                    <div>
                      <span className="text-[var(--color-ink-muted)] block font-mono text-[10px]">POLITICAL DONATIONS</span>
                      <span className="font-mono">{ownershipData.totalDonations}</span>
                    </div>
                  </div>
                  {ownershipData.subsidiaries.length > 0 && (
                    <div className="pt-2 border-t border-[var(--color-paper-border)]">
                      <span className="text-[10px] font-mono text-[var(--color-ink-muted)] block mb-1">AFFILIATED ENTITIES</span>
                      <div className="flex flex-wrap gap-1">
                        {ownershipData.subsidiaries.map((s: string, idx: number) => (
                          <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-paper-border)]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {ownershipData.notes && (
                    <p className="text-xs font-serif text-[var(--color-ink-secondary)] italic pt-1">
                      "{ownershipData.notes}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5. Satellite OSINT (#5) */}
          {activeTab === 'satellite' && (
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-sm text-[var(--color-ink)]">
                Copernicus & Landsat Satellite OSINT Comparator
              </h3>
              {satelliteData ? (
                <div className="space-y-3">
                  <div className="relative h-48 border border-[var(--color-paper-border)] rounded overflow-hidden bg-zinc-900">
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-zinc-400">
                      [Satellite Image Baseline vs Observation · Slider: {sliderPosition}%]
                    </div>
                    {/* Simulated split slider line */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 shadow"
                      style={{ left: `${sliderPosition}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -left-2.5 w-5 h-5 bg-yellow-400 text-black text-[10px] rounded-full flex items-center justify-center font-bold">
                        ↔
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={e => setSliderPosition(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-[var(--color-ink-muted)]">
                    <span>Pre-Disruption ({satelliteData.baselinePass.date})</span>
                    <span>Post-Disruption ({satelliteData.currentPass.date})</span>
                  </div>
                  <div className="p-3 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)] text-xs font-serif space-y-1">
                    <div className="font-mono text-[10px] font-bold text-[var(--color-accent)]">
                      SURFACE VARIANCE INDEX: {(satelliteData.detectedChangeIndex * 100).toFixed(0)}%
                    </div>
                    <p className="text-[var(--color-ink)] leading-relaxed">
                      {satelliteData.analysisSummary}
                    </p>
                    <div className="text-[10px] font-mono text-[var(--color-ink-muted)] pt-1">
                      Coordinates: {satelliteData.location.coordinatesFormatted}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs font-serif text-[var(--color-ink-muted)] animate-pulse">
                  Querying orbital imagery database...
                </div>
              )}
            </div>
          )}

          {/* 6. Quote Authenticator (#6) */}
          {activeTab === 'quotes' && (
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-sm text-[var(--color-ink)]">
                Quote Authenticator & Transcript Alignment Engine
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={speakerInput}
                  onChange={e => setSpeakerInput(e.target.value)}
                  placeholder="Speaker Name / Official Title..."
                  className="w-full text-xs font-serif p-2 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)]"
                />
                <textarea
                  rows={3}
                  value={quoteInput}
                  onChange={e => setQuoteInput(e.target.value)}
                  placeholder="Paste quote text to verify against transcripts..."
                  className="w-full text-xs font-serif p-2 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)]"
                />
                <button
                  onClick={handleVerifyQuote}
                  disabled={loading || !quoteInput}
                  className="w-full py-2 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-serif font-bold rounded hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Matching Transcripts...' : 'Verify Quote Provenance'}
                </button>
              </div>

              {quoteResult && (
                <div className="p-3 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300">
                      {quoteResult.contextStatus} ({quoteResult.fidelityScore}% Match)
                    </span>
                  </div>
                  <p className="text-xs font-serif text-[var(--color-ink)] italic">
                    "{quoteResult.quote}"
                  </p>
                  <div className="p-2 bg-[var(--color-paper)] rounded border border-[var(--color-paper-border)] text-xs font-serif">
                    <span className="font-bold block text-[10px] font-mono text-[var(--color-ink-muted)] mb-1">OFFICIAL LOG CONTEXT:</span>
                    <p className="text-[var(--color-ink-secondary)]">{quoteResult.surroundingContext}</p>
                  </div>
                  <p className="text-[11px] font-serif text-[var(--color-accent)] font-bold">
                    Verdict: {quoteResult.editorialVerdict}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 7. FOIA Docket (#7) */}
          {activeTab === 'foia' && (
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-sm text-[var(--color-ink)]">
                FOIA Public Records Request Cabinet
              </h3>
              <div className="p-3 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)] space-y-2">
                <span className="text-xs font-serif font-bold text-[var(--color-ink)]">File New Request:</span>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="text"
                    value={newAgency}
                    onChange={e => setNewAgency(e.target.value)}
                    placeholder="Government Agency Name (e.g. Dept. of State)..."
                    className="text-xs font-serif p-1.5 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper)]"
                  />
                  <input
                    type="text"
                    value={newSubject}
                    onChange={e => setNewSubject(e.target.value)}
                    placeholder="Subject of records sought..."
                    className="text-xs font-serif p-1.5 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper)]"
                  />
                  <button
                    onClick={handleCreateFoia}
                    disabled={loading || !newAgency || !newSubject}
                    className="py-1.5 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-serif font-bold rounded"
                  >
                    Log Request (Statutory 20-Day Timer)
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-serif font-bold text-[var(--color-ink)]">Active Docket:</span>
                {foiaRequests.length === 0 ? (
                  <p className="text-xs text-[var(--color-ink-muted)] font-serif italic">No pending FOIA requests recorded.</p>
                ) : (
                  foiaRequests.map(req => (
                    <div key={req.id} className="p-2.5 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)] space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-[var(--color-ink)]">{req.agency_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-paper)] border border-[var(--color-paper-border)] rounded">
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs font-serif text-[var(--color-ink-secondary)]">{req.subject}</p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-accent)] pt-1">
                        <span>Due: {req.statutory_deadline}</span>
                        <span>#{req.tracking_number}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 8. Sanctions Screener (#8) */}
          {activeTab === 'sanctions' && (
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-sm text-[var(--color-ink)]">
                UN, OFAC & EU Sanctions List Screener
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sanctionQuery}
                  onChange={e => setSanctionQuery(e.target.value)}
                  placeholder="Search individual, vessel, or corporate entity..."
                  className="flex-1 text-xs font-serif p-2 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)]"
                />
                <button
                  onClick={handleSanctionsScreen}
                  className="px-3 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-serif font-bold rounded"
                >
                  Screen
                </button>
              </div>

              {sanctionSearched && (
                <div className="space-y-2">
                  {sanctionMatches.length > 0 ? (
                    sanctionMatches.map(m => (
                      <div key={m.id} className="p-3 border border-red-500/30 bg-red-500/10 rounded space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-serif font-bold text-red-700 dark:text-red-400">
                            {m.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-red-600 text-white rounded font-bold">
                            SANCTIONED
                          </span>
                        </div>
                        <p className="text-xs font-serif text-[var(--color-ink)]">{m.reason}</p>
                        <div className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                          Jurisdiction: {m.jurisdiction} · Program: {m.program}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 border border-[var(--color-paper-border)] rounded bg-green-500/10 text-green-700 dark:text-green-300 text-xs font-serif text-center">
                      ✓ No sanctioned matches found in active UN/OFAC watchlist database.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 9. Clickbait De-Sensationalizer (#9) */}
          {activeTab === 'clickbait' && (
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-sm text-[var(--color-ink)]">
                Tabloid Clickbait De-Sensationalizer
              </h3>
              <div className="space-y-3">
                <textarea
                  rows={2}
                  value={clickbaitInput}
                  onChange={e => setClickbaitInput(e.target.value)}
                  placeholder="Enter sensationalized headline..."
                  className="w-full text-xs font-serif p-2 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)]"
                />
                <button
                  onClick={handleDesensationalize}
                  disabled={loading || !clickbaitInput}
                  className="w-full py-2 bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-serif font-bold rounded"
                >
                  Neutralize to AP Broadside Prose
                </button>
              </div>

              {clickbaitResult && (
                <div className="p-4 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">CALM WIRE CONVERSION</span>
                    <span className="text-[10px] font-mono font-bold text-[var(--color-accent)]">
                      Sensationalism Index: {clickbaitResult.sensationalismScore}%
                    </span>
                  </div>
                  <div className="text-xs font-serif text-[var(--color-ink-muted)] line-through">
                    {clickbaitResult.originalHeadline}
                  </div>
                  <div className="text-sm font-serif font-bold text-[var(--color-ink)]">
                    {clickbaitResult.calmHeadline}
                  </div>
                  <div className="pt-2 border-t border-[var(--color-paper-border)] flex flex-wrap gap-1">
                    {clickbaitResult.changesApplied.map((c: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-paper-border)]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 10. Revision History (#10) */}
          {activeTab === 'revisions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-sm text-[var(--color-ink)]">
                  Article Revision & Silent-Correction Diffs
                </h3>
                {activeArticle && (
                  <button
                    onClick={handleTakeSnapshot}
                    className="text-xs font-serif px-2.5 py-1 bg-[var(--color-ink)] text-[var(--color-paper)] rounded"
                  >
                    Take Snapshot Now
                  </button>
                )}
              </div>

              {revisionData && revisionData.snapshots.length > 0 ? (
                <div className="space-y-2">
                  {revisionData.snapshots.map((s: any, idx: number) => (
                    <div key={s.id} className="p-3 border border-[var(--color-paper-border)] rounded bg-[var(--color-paper-alt)] space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-[var(--color-ink)]">Snapshot #{revisionData.snapshots.length - idx}</span>
                        <span className="text-[10px] text-[var(--color-ink-muted)]">{s.capturedAt}</span>
                      </div>
                      <p className="text-xs font-serif text-[var(--color-ink)] font-bold">{s.headline}</p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-ink-muted)] pt-1">
                        <span>Length: {s.contentLength} characters</span>
                        <span>Hash: {s.hash.slice(0, 10)}...</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-[var(--color-paper-border)] rounded text-xs text-[var(--color-ink-muted)] font-serif">
                  No previous snapshots on record for this article. Take a snapshot to track silent edits.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
