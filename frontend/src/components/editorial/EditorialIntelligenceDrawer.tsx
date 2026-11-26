import React, { useState, useEffect } from 'react';
import { 
  Scale, History, Globe, FileText, Compass, 
  CheckCheck, BookOpen, Activity, Briefcase, GraduationCap,
  AlertTriangle, RefreshCw, X, Search, Send, ArrowRight
} from 'lucide-react';
import { api } from '../../lib/api';
import { triggerHaptic } from '../../lib/haptics';
import type { Article } from '../../types';

export type EditorialTab = 
  | 'devils_advocate' 
  | 'rhymes' 
  | 'prism' 
  | 'legislation' 
  | 'narrative_arc' 
  | 'factchecker' 
  | 'demystifier' 
  | 'sentiment_drift' 
  | 'executive_dossier' 
  | 'socratic_tutor';

interface EditorialIntelligenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeArticle?: Article | null;
  initialTab?: EditorialTab;
}

export const EditorialIntelligenceDrawer: React.FC<EditorialIntelligenceDrawerProps> = ({
  isOpen,
  onClose,
  activeArticle,
  initialTab = 'devils_advocate',
}) => {
  const [activeTab, setActiveTab] = useState<EditorialTab>(initialTab);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Tab 1: Devil's Advocate
  const [devilsData, setDevilsData] = useState<any | null>(null);

  // Tab 2: Historical Rhymes
  const [rhymesQuery, setRhymesQuery] = useState<string>('');
  const [rhymesData, setRhymesData] = useState<any | null>(null);

  // Tab 3: Global Prism
  const [prismData, setPrismData] = useState<any | null>(null);

  // Tab 4: Legislation Explainer
  const [legislationQuery, setLegislationQuery] = useState<string>('Section 230');
  const [legislationData, setLegislationData] = useState<any | null>(null);

  // Tab 5: Narrative Arc
  const [narrativeData, setNarrativeData] = useState<any | null>(null);

  // Tab 6: Fact-Checking Assistant
  const [draftText, setDraftText] = useState<string>(
    'Central banks have raised rates sharply. The government announced emergency economic measures today.'
  );
  const [factCheckResult, setFactCheckResult] = useState<any | null>(null);

  // Tab 7: Jargon Demystifier
  const [jargonTerm, setJargonTerm] = useState<string>('reverse repo');
  const [jargonResult, setJargonResult] = useState<any | null>(null);

  // Tab 8: Sentiment Drift
  const [sentimentData, setSentimentData] = useState<any | null>(null);

  // Tab 9: Executive Dossier
  const [dossierData, setDossierData] = useState<any | null>(null);

  // Tab 10: Socratic Tutor
  const [tutorStage, setTutorStage] = useState<number>(1);
  const [tutorConversation, setTutorConversation] = useState<Array<{ sender: 'editor' | 'user'; text: string }>>([]);
  const [tutorOptions, setTutorOptions] = useState<string[]>([]);
  const [customReply, setCustomReply] = useState<string>('');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (activeArticle) {
      setRhymesQuery(activeArticle.title_english || '');
      // Auto fetch relevant data for active tab
      if (activeTab === 'devils_advocate') {
        fetchDevilsAdvocate(activeArticle.title_english, activeArticle.summary);
      } else if (activeTab === 'rhymes') {
        fetchHistoricalRhymes(activeArticle.title_english, activeArticle.id);
      } else if (activeTab === 'prism') {
        fetchGlobalPrism(activeArticle.id);
      } else if (activeTab === 'narrative_arc') {
        fetchNarrativeArc(activeArticle.id);
      } else if (activeTab === 'socratic_tutor') {
        initSocraticTutor(activeArticle.id);
      }
    }
  }, [activeArticle, activeTab]);

  const fetchDevilsAdvocate = async (title?: string, text?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDevilsAdvocate(title || 'Headline Event', text || 'Details');
      setDevilsData(data);
    } catch {
      setError('Unable to assemble dialectical counter-brief.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalRhymes = async (query?: string, articleId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHistoricalRhymes(query, articleId);
      setRhymesData(data);
    } catch {
      setError('Historical precedent index query failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalPrism = async (articleId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getGlobalPerspectives(articleId);
      setPrismData(data);
    } catch {
      setError('Foreign bureau wire aggregation failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNarrativeArc = async (articleId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNarrativeArc(articleId);
      setNarrativeData(data);
    } catch {
      setError('Story cycle trajectory calculation failed.');
    } finally {
      setLoading(false);
    }
  };

  const initSocraticTutor = async (articleId?: number) => {
    setLoading(true);
    setError(null);
    setTutorStage(1);
    try {
      const data = await api.runSocraticTutor(articleId, undefined, 1);
      setTutorConversation([{ sender: 'editor', text: data.inquiry }]);
      setTutorOptions(data.followUpOptions);
    } catch {
      setError('Editorial tutor initialization failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: EditorialTab) => {
    triggerHaptic('selection');
    setActiveTab(tab);
    setError(null);

    if (tab === 'devils_advocate' && activeArticle && !devilsData) {
      fetchDevilsAdvocate(activeArticle.title_english, activeArticle.summary);
    } else if (tab === 'rhymes' && activeArticle && !rhymesData) {
      fetchHistoricalRhymes(activeArticle.title_english, activeArticle.id);
    } else if (tab === 'prism' && activeArticle && !prismData) {
      fetchGlobalPrism(activeArticle.id);
    } else if (tab === 'narrative_arc' && activeArticle && !narrativeData) {
      fetchNarrativeArc(activeArticle.id);
    } else if (tab === 'sentiment_drift' && !sentimentData) {
      fetchSentimentDrift();
    } else if (tab === 'executive_dossier' && !dossierData) {
      fetchExecutiveDossier();
    } else if (tab === 'socratic_tutor' && tutorConversation.length === 0) {
      initSocraticTutor(activeArticle?.id);
    } else if (tab === 'legislation' && !legislationData) {
      handleExplainLegislation();
    } else if (tab === 'demystifier' && !jargonResult) {
      handleDemystify();
    }
  };

  const handleExplainLegislation = async () => {
    if (!legislationQuery) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.explainLegislation(legislationQuery);
      setLegislationData(data);
      triggerHaptic('selection');
    } catch {
      setError('Statutory clause search failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFactCheckDraft = async () => {
    if (!draftText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.factcheckDraft(draftText);
      setFactCheckResult(data);
      triggerHaptic('selection');
    } catch {
      setError('Draft fact-checking verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemystify = async () => {
    if (!jargonTerm) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.demystifyTerm(jargonTerm);
      setJargonResult(data);
      triggerHaptic('selection');
    } catch {
      setError('Glossary decoding failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSentimentDrift = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSentimentDrift();
      setSentimentData(data);
    } catch {
      setError('Public mood sentiment metrics unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutiveDossier = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLatestExecutiveDossier();
      setDossierData(data);
    } catch {
      setError('Executive Intelligence dossier compilation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocraticReply = async (replyText: string) => {
    if (!replyText.trim()) return;
    const nextStage = tutorStage + 1;
    setTutorStage(nextStage);
    setTutorConversation(prev => [...prev, { sender: 'user', text: replyText }]);
    setCustomReply('');
    setLoading(true);
    setError(null);
    try {
      const data = await api.runSocraticTutor(activeArticle?.id, replyText, nextStage);
      setTutorConversation(prev => [...prev, { sender: 'editor', text: data.inquiry }]);
      setTutorOptions(data.followUpOptions);
      triggerHaptic('selection');
    } catch {
      setError('Socratic dialogue continuation failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editorial-desk-title"
    >
      <div className="relative flex flex-col w-full max-w-5xl h-[92vh] max-h-[860px] bg-[var(--color-paper)] border-2 border-[var(--color-paper-border)] shadow-2xl overflow-hidden rounded-none text-[var(--color-ink)]">
        
        {/* Newspaper Masthead Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-[var(--color-paper-alt)] border-b-2 border-[var(--color-paper-border)]">
          <div className="flex items-center space-x-3">
            <span className="border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-0.5 text-xs font-mono uppercase tracking-widest font-bold">
              AI Editorial Bureau
            </span>
            <h2 id="editorial-desk-title" className="text-lg sm:text-xl font-serif font-black tracking-tight text-[var(--color-ink)]">
              EDITORIAL INTELLIGENCE &amp; SOCRATIC ANALYSIS
            </h2>
          </div>
          <button
            onClick={() => {
              triggerHaptic('selection');
              onClose();
            }}
            aria-label="Close Editorial Intelligence Desk"
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-border)]/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* 10-Tab Navigation Bar */}
        <nav 
          aria-label="Editorial Desks"
          className="flex overflow-x-auto no-scrollbar border-b border-[var(--color-paper-border)] bg-[var(--color-paper)] text-xs font-mono uppercase tracking-wider divide-x divide-[var(--color-paper-border)]"
        >
          <button
            onClick={() => handleTabChange('devils_advocate')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'devils_advocate' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>#11 Counter-Brief</span>
          </button>

          <button
            onClick={() => handleTabChange('rhymes')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'rhymes' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>#12 History Rhymes</span>
          </button>

          <button
            onClick={() => handleTabChange('prism')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'prism' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>#13 Global Prism</span>
          </button>

          <button
            onClick={() => handleTabChange('legislation')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'legislation' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>#14 Bill Explainer</span>
          </button>

          <button
            onClick={() => handleTabChange('narrative_arc')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'narrative_arc' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>#15 Story Lifespan</span>
          </button>

          <button
            onClick={() => handleTabChange('factchecker')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'factchecker' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>#16 Fact-Checker</span>
          </button>

          <button
            onClick={() => handleTabChange('demystifier')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'demystifier' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>#17 Demystifier</span>
          </button>

          <button
            onClick={() => handleTabChange('sentiment_drift')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'sentiment_drift' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>#18 Public Mood</span>
          </button>

          <button
            onClick={() => handleTabChange('executive_dossier')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'executive_dossier' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>#19 PDB Dossier</span>
          </button>

          <button
            onClick={() => handleTabChange('socratic_tutor')}
            className={`flex items-center space-x-1.5 px-3 py-2.5 whitespace-nowrap transition-colors ${
              activeTab === 'socratic_tutor' 
                ? 'bg-[var(--color-paper-alt)] font-bold text-[var(--color-accent)] border-b-2 border-b-[var(--color-accent)]' 
                : 'text-[var(--color-ink-secondary)] hover:bg-[var(--color-paper-alt)]/60'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>#20 Socratic Tutor</span>
          </button>
        </nav>

        {/* Desk Body Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--color-paper)]">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-600 text-red-900 text-sm font-sans flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--color-ink-muted)] space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin text-[var(--color-accent)]" />
              <p className="font-mono text-xs uppercase tracking-wider">
                Consulting Archives &amp; Intelligence Models...
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: DEVIL'S ADVOCATE */}
              {activeTab === 'devils_advocate' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #11 · Dialectical Synthesis
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      "Devil's Advocate" Opposing Brief
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Challenges the prevailing press consensus by generating principled, evidence-backed counter-theses and institutional counterweights.
                    </p>
                  </div>

                  {devilsData ? (
                    <div className="space-y-5">
                      <div className="p-4 bg-[var(--color-paper-alt)] border-l-4 border-[var(--color-accent)]">
                        <div className="text-xs font-mono uppercase tracking-widest text-[var(--color-ink-muted)]">
                          Core Counter-Thesis Rebuttal
                        </div>
                        <p className="font-serif text-base italic mt-1 leading-relaxed">
                          "{devilsData.coreThesisRebuttal}"
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="text-xs font-mono uppercase tracking-widest text-[var(--color-ink-muted)]">
                          Substantive Counter-Arguments &amp; Precedents
                        </div>
                        {devilsData.counterArguments?.map((item: any, idx: number) => (
                          <div key={idx} className="p-3 border border-[var(--color-paper-border)] bg-[var(--color-paper)]">
                            <h4 className="font-serif font-bold text-sm text-[var(--color-ink)]">
                              {idx + 1}. {item.point}
                            </h4>
                            <p className="font-sans text-xs text-[var(--color-ink-secondary)] mt-1 leading-normal">
                              {item.rationale}
                            </p>
                            <div className="mt-2 text-[10px] font-mono text-[var(--color-ink-muted)] border-t border-[var(--color-paper-border)] pt-1">
                              <strong>Historical Precedent:</strong> {item.precedentCite}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] flex items-center justify-between text-xs font-mono">
                        <span className="text-[var(--color-ink-secondary)]">
                          Editorial Confidence Rating: <strong>{devilsData.confidenceScore}%</strong>
                        </span>
                        <span className="text-[var(--color-accent)] font-bold">
                          VERDICT: DIALECTIC REVIEWED
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-[var(--color-ink-muted)] font-mono text-sm border-2 border-dashed border-[var(--color-paper-border)]">
                      Select an article or trigger analysis to generate opposing brief.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: HISTORICAL RHYMES */}
              {activeTab === 'rhymes' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #12 · Temporal Pattern Matching
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Historical Parallel Engine ("History Rhymes")
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Matches modern crises against 19th and 20th-century historical precedents to derive predictive outcomes and structural lessons.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rhymesQuery}
                      onChange={(e) => setRhymesQuery(e.target.value)}
                      placeholder="Search crisis keyword or dispatch headline..."
                      className="flex-1 px-3 py-2 bg-[var(--color-paper)] border border-[var(--color-paper-border)] text-sm font-sans focus:outline-none focus:border-[var(--color-accent)]"
                    />
                    <button
                      onClick={() => fetchHistoricalRhymes(rhymesQuery)}
                      className="px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-mono text-xs uppercase tracking-wider hover:bg-[var(--color-accent)] transition-colors flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Find Precedent</span>
                    </button>
                  </div>

                  {rhymesData?.parallel ? (
                    <div className="p-5 border-2 border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] space-y-4">
                      <div className="flex items-center justify-between border-b border-[var(--color-paper-border)] pb-2">
                        <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-bold">
                          {rhymesData.parallel.era} · AD {rhymesData.parallel.precedentYear}
                        </span>
                        <span className="text-xs font-mono text-[var(--color-ink-muted)]">
                          ARCHIVAL MATCH #020
                        </span>
                      </div>

                      <h4 className="font-serif font-black text-lg text-[var(--color-ink)]">
                        {rhymesData.parallel.eventName}
                      </h4>

                      <p className="font-serif text-sm leading-relaxed text-[var(--color-ink)]">
                        {rhymesData.parallel.summary}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 bg-[var(--color-paper)] border border-[var(--color-paper-border)]">
                          <div className="text-[10px] font-mono uppercase text-[var(--color-ink-muted)] font-bold">
                            Historical Outcome
                          </div>
                          <p className="font-sans text-xs text-[var(--color-ink-secondary)] mt-1">
                            {rhymesData.parallel.historicalOutcome}
                          </p>
                        </div>
                        <div className="p-3 bg-[var(--color-paper)] border border-[var(--color-accent)]/50">
                          <div className="text-[10px] font-mono uppercase text-[var(--color-accent)] font-bold">
                            Parallel Lesson for Today
                          </div>
                          <p className="font-sans text-xs text-[var(--color-ink)] mt-1 font-medium">
                            {rhymesData.parallel.parallelLesson}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-[var(--color-ink-muted)] font-mono text-sm border-2 border-dashed border-[var(--color-paper-border)]">
                      No historical parallel found for query. Try "bank liquidity", "tariffs", or "defensive treaty".
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: GLOBAL PRISM */}
              {activeTab === 'prism' && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #13 · International Press Bureaus
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Local Perspective Prism (Global News, Local Eyes)
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Examines the active dispatch through 5 distinct international foreign bureau angles, spotlighting regional priorities and cultural framing.
                    </p>
                  </div>

                  {prismData ? (
                    <div className="space-y-4">
                      <div className="text-xs font-mono text-[var(--color-ink-muted)]">
                        DISPATCH: <strong>{prismData.headline}</strong>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {prismData.perspectives?.map((p: any, idx: number) => (
                          <div key={idx} className="p-4 border border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] space-y-2">
                            <div className="flex items-center justify-between border-b border-[var(--color-paper-border)] pb-1.5">
                              <span className="font-serif font-bold text-sm flex items-center gap-1.5">
                                <span>{p.flag}</span>
                                <span>{p.bureau}</span>
                              </span>
                              <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                                {p.outlet}
                              </span>
                            </div>

                            <p className="font-serif text-xs italic text-[var(--color-ink-secondary)] leading-relaxed">
                              {p.leadExcerpt}
                            </p>

                            <p className="font-sans text-xs text-[var(--color-ink)] leading-normal pt-1">
                              {p.translatedAnalysis}
                            </p>

                            <div className="text-[10px] font-mono text-[var(--color-accent)] font-bold pt-1 border-t border-[var(--color-paper-border)]">
                              FOCAL CONCERN: {p.keyConcern}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-[var(--color-ink-muted)] font-mono text-sm border-2 border-dashed border-[var(--color-paper-border)]">
                      Select an article in the Reader to view local foreign bureau perspectives.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: LEGISLATION EXPLAINER */}
              {activeTab === 'legislation' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #14 · Statutory &amp; Treaty Analysis
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Legislative Bill &amp; Treaty Clause Explainer
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Translates complex legal boilerplate, statutory articles, and treaty clauses into plain English with real-world impact assessments.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={legislationQuery}
                      onChange={(e) => setLegislationQuery(e.target.value)}
                      placeholder="E.g., Section 230, GDPR Article 17, Article 5 NATO..."
                      className="flex-1 px-3 py-2 bg-[var(--color-paper)] border border-[var(--color-paper-border)] text-sm font-sans focus:outline-none focus:border-[var(--color-accent)]"
                    />
                    <button
                      onClick={handleExplainLegislation}
                      className="px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-mono text-xs uppercase tracking-wider hover:bg-[var(--color-accent)] transition-colors flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Decode Clause</span>
                    </button>
                  </div>

                  {legislationData && (
                    <div className="p-5 border-2 border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] space-y-4">
                      <div className="flex items-center justify-between border-b border-[var(--color-paper-border)] pb-2">
                        <span className="text-xs font-mono font-bold text-[var(--color-accent)] uppercase tracking-wider">
                          {legislationData.category} · {legislationData.clauseReference}
                        </span>
                        <span className="text-xs font-mono text-[var(--color-ink-muted)]">
                          {legislationData.found ? 'STATUTE IDENTIFIED' : 'GENERAL INTERPRETATION'}
                        </span>
                      </div>

                      <h4 className="font-serif font-black text-lg text-[var(--color-ink)]">
                        {legislationData.actName}
                      </h4>

                      <div className="p-3 bg-[var(--color-paper)] border border-[var(--color-paper-border)]">
                        <div className="text-[10px] font-mono uppercase text-[var(--color-ink-muted)] font-bold">
                          Plain-Language Interpretation
                        </div>
                        <p className="font-serif text-sm text-[var(--color-ink)] mt-1 leading-relaxed">
                          {legislationData.plainExplanation}
                        </p>
                      </div>

                      <div className="p-3 bg-[var(--color-paper)] border-l-4 border-[var(--color-accent)]">
                        <div className="text-[10px] font-mono uppercase text-[var(--color-accent)] font-bold">
                          Real-World Impact &amp; Citizen Consequences
                        </div>
                        <p className="font-sans text-xs text-[var(--color-ink-secondary)] mt-1 leading-normal">
                          {legislationData.realWorldImpact}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: NARRATIVE ARC */}
              {activeTab === 'narrative_arc' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #15 · Story Velocity &amp; Lifespan
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Narrative Arc / Story Lifespan Predictor
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Forecasts whether a wire event is a transient 24-hour cycle flare, an active developing investigation, or a multi-year structural shift.
                    </p>
                  </div>

                  {narrativeData ? (
                    <div className="p-5 border-2 border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] space-y-5">
                      <div className="flex items-center justify-between border-b border-[var(--color-paper-border)] pb-2">
                        <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-ink-muted)]">
                          CLUSTER VOLUME: {narrativeData.clusterSize} DISPATCHES
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider ${
                          narrativeData.classification === 'STRUCTURAL_SHIFT'
                            ? 'bg-red-800 text-white'
                            : narrativeData.classification === 'DEVELOPING_INVESTIGATION'
                            ? 'bg-amber-800 text-white'
                            : 'bg-zinc-700 text-white'
                        }`}>
                          {narrativeData.classification.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-mono uppercase text-[var(--color-ink-muted)]">
                          Dispatched Headline
                        </div>
                        <h4 className="font-serif font-black text-base text-[var(--color-ink)] mt-0.5">
                          {narrativeData.headline}
                        </h4>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span>Story Velocity Score</span>
                          <span className="font-bold">{narrativeData.velocityScore}/100</span>
                        </div>
                        <div className="w-full bg-[var(--color-paper-border)] h-2.5 overflow-hidden">
                          <div 
                            className="bg-[var(--color-accent)] h-full transition-all duration-500" 
                            style={{ width: `${narrativeData.velocityScore}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-[var(--color-paper)] border border-[var(--color-paper-border)]">
                        <div className="text-[10px] font-mono uppercase text-[var(--color-ink-muted)] font-bold">
                          Projected Wire Lifespan
                        </div>
                        <div className="font-serif text-sm font-bold text-[var(--color-ink)] mt-0.5">
                          {narrativeData.projectedLifespan}
                        </div>
                      </div>

                      <div className="p-3 bg-[var(--color-paper)] border-l-4 border-[var(--color-ink)] text-xs font-sans text-[var(--color-ink-secondary)]">
                        <strong>Editorial Guidance:</strong> {narrativeData.editorialAdvice}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-[var(--color-ink-muted)] font-mono text-sm border-2 border-dashed border-[var(--color-paper-border)]">
                      Select an article to forecast its editorial narrative arc and lifespan.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: FACT-CHECKING ASSISTANT */}
              {activeTab === 'factchecker' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #16 · Pre-Publication Safeguard
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Pre-Publication Fact-Checking Assistant for User Notes
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Cross-references reader notes and journalistic drafts against verified wire reporting in your local newsprint database.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)] block">
                      Draft Dispatch / Reporter Margin Note
                    </label>
                    <textarea
                      rows={4}
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      className="w-full p-3 bg-[var(--color-paper)] border border-[var(--color-paper-border)] text-sm font-serif focus:outline-none focus:border-[var(--color-accent)] leading-relaxed"
                      placeholder="Type or paste reporting draft here to verify facts..."
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleFactCheckDraft}
                        className="px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-mono text-xs uppercase tracking-wider hover:bg-[var(--color-accent)] transition-colors flex items-center gap-1.5"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Run Fact-Check Verification</span>
                      </button>
                    </div>
                  </div>

                  {factCheckResult && (
                    <div className="p-4 border-2 border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] space-y-4">
                      <div className="flex items-center justify-between border-b border-[var(--color-paper-border)] pb-2 text-xs font-mono">
                        <span>SENTENCES VERIFIED: <strong>{factCheckResult.verifiedCount} / {factCheckResult.totalSentencesChecked}</strong></span>
                        <span className="text-[var(--color-accent)] font-bold">
                          FIDELITY: {Math.round(factCheckResult.fidelityRatio * 100)}%
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {factCheckResult.checkedSentences?.map((item: any, idx: number) => (
                          <div 
                            key={idx} 
                            className={`p-3 border bg-[var(--color-paper)] ${
                              item.status === 'verified' 
                                ? 'border-emerald-700/60' 
                                : 'border-amber-700/60'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
                              <span className={item.status === 'verified' ? 'text-emerald-700 font-bold' : 'text-amber-800 font-bold'}>
                                {item.status.toUpperCase()} ({item.matchConfidence}%)
                              </span>
                              {item.citedArticleId && (
                                <span className="text-[var(--color-ink-muted)]">
                                  CORPUS REF #{item.citedArticleId}
                                </span>
                              )}
                            </div>
                            <p className="font-serif text-sm mt-1 text-[var(--color-ink)]">
                              "{item.sentence}"
                            </p>
                            {item.citationTitle && (
                              <div className="mt-1.5 text-[11px] font-sans text-[var(--color-ink-secondary)]">
                                <strong>Corroborating Wire:</strong> {item.citationTitle}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: JARGON DEMYSTIFIER */}
              {activeTab === 'demystifier' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #17 · Layman Translator
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Jargon &amp; Legalese Instant Demystifier
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Strips out obfuscated terminology from financial dispatches, treaties, and legalese, providing plain meanings and real-world analogies.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={jargonTerm}
                      onChange={(e) => setJargonTerm(e.target.value)}
                      placeholder="E.g., reverse repo, credit default swap, force majeure..."
                      className="flex-1 px-3 py-2 bg-[var(--color-paper)] border border-[var(--color-paper-border)] text-sm font-sans focus:outline-none focus:border-[var(--color-accent)]"
                    />
                    <button
                      onClick={handleDemystify}
                      className="px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-mono text-xs uppercase tracking-wider hover:bg-[var(--color-accent)] transition-colors flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Demystify</span>
                    </button>
                  </div>

                  {jargonResult && (
                    <div className="p-5 border-2 border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] space-y-4">
                      <div className="flex items-center justify-between border-b border-[var(--color-paper-border)] pb-2">
                        <span className="text-xs font-mono font-bold text-[var(--color-accent)] uppercase tracking-wider">
                          FIELD: {jargonResult.field}
                        </span>
                        <span className="text-xs font-mono text-[var(--color-ink-muted)]">
                          GLOSSARY ENTRY
                        </span>
                      </div>

                      <h4 className="font-serif font-black text-xl text-[var(--color-ink)] capitalize">
                        "{jargonResult.term}"
                      </h4>

                      <div className="p-3 bg-[var(--color-paper)] border border-[var(--color-paper-border)]">
                        <div className="text-[10px] font-mono uppercase text-[var(--color-ink-muted)] font-bold">
                          Plain-Language Meaning
                        </div>
                        <p className="font-serif text-sm text-[var(--color-ink)] mt-1 leading-relaxed">
                          {jargonResult.plainMeaning}
                        </p>
                      </div>

                      <div className="p-3 bg-[var(--color-paper)] border-l-4 border-[var(--color-accent)]">
                        <div className="text-[10px] font-mono uppercase text-[var(--color-accent)] font-bold">
                          Everyday Analogy
                        </div>
                        <p className="font-serif text-xs italic text-[var(--color-ink-secondary)] mt-1 leading-relaxed">
                          {jargonResult.everydayAnalogy}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: SENTIMENT DRIFT */}
              {activeTab === 'sentiment_drift' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #18 · Macro Sentiment Drift
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Sentiment Drift &amp; Public Mood Monitor
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Tracks subtle shifts in editorial tone and public sentiment across macro topics over rolling 30-day reporting windows.
                    </p>
                  </div>

                  {sentimentData?.topics ? (
                    <div className="space-y-4">
                      {sentimentData.topics.map((t: any, idx: number) => (
                        <div key={idx} className="p-4 border border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-serif font-bold text-base text-[var(--color-ink)]">
                              {t.topic}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider ${
                              t.direction === 'WARMING' 
                                ? 'bg-emerald-800 text-white' 
                                : t.direction === 'COOLING' 
                                ? 'bg-blue-800 text-white' 
                                : 'bg-zinc-700 text-white'
                            }`}>
                              {t.direction} ({t.velocity > 0 ? `+${t.velocity}` : t.velocity})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">Rolling Trend:</span>
                            <div className="flex items-center gap-3">
                              {t.dataPoints?.map((dp: any, dIdx: number) => (
                                <div key={dIdx} className="flex flex-col items-center">
                                  <span className="text-[9px] font-mono text-[var(--color-ink-muted)]">
                                    {dp.date.slice(5)}
                                  </span>
                                  <div 
                                    className={`w-3 h-3 rounded-full mt-0.5 ${
                                      dp.score > 0 ? 'bg-emerald-600' : dp.score < 0 ? 'bg-red-600' : 'bg-zinc-400'
                                    }`}
                                    title={`Score: ${dp.score}`}
                                  />
                                  <span className="text-[9px] font-mono font-bold mt-0.5">
                                    {dp.score}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-[var(--color-ink-muted)] font-mono text-sm border-2 border-dashed border-[var(--color-paper-border)]">
                      No sentiment telemetry recorded. Trigger ingestion or seed update.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 9: EXECUTIVE DOSSIER */}
              {activeTab === 'executive_dossier' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #19 · Top Secret Clearance
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      Automated Weekly Executive Intelligence Dossier
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      A synthesized intelligence briefing (PDB format) highlighting strategic threats, risk matrices, and global forecasting.
                    </p>
                  </div>

                  {dossierData ? (
                    <div className="p-6 border-4 border-double border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] space-y-5">
                      <div className="flex items-center justify-between border-b-2 border-[var(--color-paper-border)] pb-3">
                        <div>
                          <div className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-accent)]">
                            {dossierData.weekLabel}
                          </div>
                          <h4 className="font-serif font-black text-xl text-[var(--color-ink)] mt-0.5">
                            {dossierData.title}
                          </h4>
                        </div>
                        <div className="border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-1 text-xs font-mono font-bold tracking-widest uppercase">
                          EYES ONLY
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-mono uppercase text-[var(--color-ink-muted)] font-bold">
                          Executive Situation Assessment
                        </div>
                        <p className="font-serif text-sm leading-relaxed text-[var(--color-ink)] mt-1">
                          {dossierData.executiveSummary}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[10px] font-mono uppercase text-[var(--color-ink-muted)] font-bold">
                          Strategic Threat Matrix
                        </div>
                        <div className="divide-y divide-[var(--color-paper-border)] border border-[var(--color-paper-border)] bg-[var(--color-paper)]">
                          {dossierData.riskMatrix?.map((r: any, idx: number) => (
                            <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                              <span className="font-serif font-medium text-[var(--color-ink)]">
                                {r.threat}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                  r.level === 'CRITICAL' ? 'bg-red-800 text-white' : 'bg-amber-800 text-white'
                                }`}>
                                  {r.level}
                                </span>
                                <span className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                                  {r.trend}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-[var(--color-paper)] border-l-4 border-[var(--color-accent)]">
                        <div className="text-[10px] font-mono uppercase text-[var(--color-accent)] font-bold">
                          Forward Geopolitical Forecast
                        </div>
                        <p className="font-serif text-xs italic text-[var(--color-ink-secondary)] mt-1 leading-relaxed">
                          {dossierData.strategicForecast}
                        </p>
                      </div>

                      <div className="text-[10px] font-mono text-[var(--color-ink-muted)] flex justify-between pt-2 border-t border-[var(--color-paper-border)]">
                        <span>Corpus Articles Processed: {dossierData.corpusArticlesAnalyzed}</span>
                        <span>Generated: {new Date(dossierData.generatedAt).toUTCString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-[var(--color-ink-muted)] font-mono text-sm border-2 border-dashed border-[var(--color-paper-border)]">
                      Executive dossier compiling. Click to generate latest briefing.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 10: SOCRATIC TUTOR */}
              {activeTab === 'socratic_tutor' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="border-b pb-3 border-[var(--color-paper-border)]">
                    <span className="font-mono text-xs text-[var(--color-accent)] font-bold uppercase tracking-wider">
                      Feature #20 · Dialectical Inquiry
                    </span>
                    <h3 className="text-xl font-serif font-black mt-1">
                      AI Socratic News Tutor
                    </h3>
                    <p className="text-sm font-sans text-[var(--color-ink-secondary)] mt-1">
                      Sharpens your critical news literacy through dialectical Socratic questioning guided by senior bureau editors.
                    </p>
                  </div>

                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {tutorConversation.map((msg, idx) => (
                      <div 
                        key={idx}
                        className={`p-4 border ${
                          msg.sender === 'editor'
                            ? 'bg-[var(--color-paper-alt)] border-[var(--color-paper-border)] mr-8 border-l-4 border-l-[var(--color-accent)]'
                            : 'bg-[var(--color-paper)] border-[var(--color-ink)]/30 ml-8 text-right'
                        }`}
                      >
                        <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
                          {msg.sender === 'editor' ? 'Senior Bureau Chief (Geneva)' : 'Your Response'}
                        </div>
                        <p className="font-serif text-sm text-[var(--color-ink)] leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  {tutorStage < 3 && tutorOptions.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[var(--color-paper-border)]">
                      <div className="text-xs font-mono uppercase text-[var(--color-ink-muted)]">
                        Select a hypothesis or type your reasoning below:
                      </div>
                      <div className="space-y-2">
                        {tutorOptions.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSocraticReply(opt)}
                            className="w-full text-left p-3 text-xs font-sans border border-[var(--color-paper-border)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-alt)] hover:border-[var(--color-accent)] transition-colors flex items-center justify-between"
                          >
                            <span>{opt}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0" />
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          value={customReply}
                          onChange={(e) => setCustomReply(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customReply.trim()) {
                              handleSocraticReply(customReply);
                            }
                          }}
                          placeholder="Or type an independent diplomatic perspective..."
                          className="flex-1 px-3 py-2 bg-[var(--color-paper)] border border-[var(--color-paper-border)] text-sm font-sans focus:outline-none focus:border-[var(--color-accent)]"
                        />
                        <button
                          onClick={() => handleSocraticReply(customReply)}
                          disabled={!customReply.trim()}
                          className="px-4 py-2 bg-[var(--color-ink)] text-[var(--color-paper)] font-mono text-xs uppercase tracking-wider hover:bg-[var(--color-accent)] transition-colors disabled:opacity-40 flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {tutorStage >= 3 && (
                    <div className="p-4 bg-emerald-50 border border-emerald-600 text-emerald-900 text-xs font-mono flex items-center justify-between">
                      <span>Dialectical examination complete. Synthesis archived to margin notes.</span>
                      <button
                        onClick={() => initSocraticTutor(activeArticle?.id)}
                        className="underline hover:text-emerald-700 font-bold"
                      >
                        Start New Session
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="px-4 py-2 bg-[var(--color-paper-alt)] border-t border-[var(--color-paper-border)] flex items-center justify-between text-xs font-mono text-[var(--color-ink-muted)]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>EDITORIAL DESK: ACTIVE</span>
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
