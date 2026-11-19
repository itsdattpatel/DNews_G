/**
 * frontend/src/components/article/EntityDossierDrawer.tsx
 * Archival Entity Dossier & Deep Connection Inspector
 * Opens as a slide-over panel from the right when an entity or key figure is clicked.
 * Shows historical frequency across SQLite, sentiment/urgency, co-occurring figures,
 * and chronological dispatch archives with one-click article navigation.
 */
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  X,
  FileText,
  Globe2,
  Users,
  Flame,
  ArrowRight,
} from 'lucide-react';

interface DossierArticle {
  id: number;
  url: string;
  title_english: string;
  summary: string;
  published_at: string | null;
  breaking_score: number;
  source: {
    name: string;
    country: string;
  };
}

interface DossierData {
  success: boolean;
  entity: string;
  total_mentions: number;
  avg_breaking_score: number;
  first_seen: string | null;
  last_seen: string | null;
  co_occurring_entities: Array<{ keyword: string; count: number }>;
  top_sources: Array<{ source_name: string; source_country: string; count: number }>;
  articles: DossierArticle[];
}

interface EntityDossierDrawerProps {
  entityName: string | null;
  onClose: () => void;
}

export const EntityDossierDrawer: React.FC<EntityDossierDrawerProps> = ({
  entityName,
  onClose,
}) => {
  const [data, setData] = useState<DossierData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectArticleById = useAppStore((s) => s.selectArticleById);

  useEffect(() => {
    if (!entityName) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/entities/dossier?name=${encodeURIComponent(entityName)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((result: DossierData) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load entity dossier');
        setLoading(false);
      });
  }, [entityName]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!entityName) return null;

  return (
    <div
      id="entity-dossier-overlay"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        id="entity-dossier-drawer"
        role="dialog"
        aria-label={`Entity Dossier: ${entityName}`}
        className="w-full max-w-xl h-full bg-paper border-l-2 border-ink shadow-2xl flex flex-col overflow-hidden text-ink animate-in slide-in-from-right duration-300"
      >
        {/* Dossier Archival Header */}
        <div className="p-5 border-b-2 border-ink bg-paper-alt flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border border-ink font-bold bg-paper text-accent">
                CONFIDENTIAL DOSSIER
              </span>
              <span className="font-mono text-[10px] text-ink-muted">
                ARCHIVAL INTELLIGENCE FILE
              </span>
            </div>
            <h2 className="font-headline text-2xl font-bold tracking-tight text-ink">
              {entityName}
            </h2>
          </div>
          <button
            id="btn-close-entity-dossier"
            onClick={onClose}
            className="p-1.5 rounded-xs border border-paper-border hover:border-ink hover:bg-paper text-ink-muted hover:text-ink transition-colors cursor-pointer"
            title="Close Dossier (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="animate-spin text-2xl text-accent inline-block">✦</div>
              <p className="font-ui text-xs text-ink-muted uppercase tracking-wider">
                Compiling historical intelligence dossier…
              </p>
            </div>
          ) : error ? (
            <div className="p-4 border border-accent bg-accent/10 rounded-xs text-center text-xs text-accent">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Telemetry Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 border border-paper-border bg-paper-alt rounded-xs">
                  <div className="text-[10px] font-mono uppercase text-ink-muted">
                    Total Records
                  </div>
                  <div className="text-xl font-headline font-bold text-ink">
                    {data.total_mentions}
                  </div>
                </div>
                <div className="p-3 border border-paper-border bg-paper-alt rounded-xs">
                  <div className="text-[10px] font-mono uppercase text-ink-muted">
                    Avg Urgency
                  </div>
                  <div className="text-xl font-headline font-bold text-accent flex items-center gap-1">
                    <Flame size={14} />
                    <span>{data.avg_breaking_score}</span>
                  </div>
                </div>
                <div className="p-3 border border-paper-border bg-paper-alt rounded-xs">
                  <div className="text-[10px] font-mono uppercase text-ink-muted">
                    First Record
                  </div>
                  <div className="text-xs font-mono font-bold text-ink truncate mt-1">
                    {data.first_seen ? new Date(data.first_seen).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div className="p-3 border border-paper-border bg-paper-alt rounded-xs">
                  <div className="text-[10px] font-mono uppercase text-ink-muted">
                    Latest Record
                  </div>
                  <div className="text-xs font-mono font-bold text-ink truncate mt-1">
                    {data.last_seen ? new Date(data.last_seen).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>

              {/* Co-occurring Key Figures */}
              {data.co_occurring_entities.length > 0 && (
                <div>
                  <h3 className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary mb-2 flex items-center gap-1.5">
                    <Users size={13} />
                    <span>Linked Key Figures & Co-Occurrences</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data.co_occurring_entities.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono border border-paper-border bg-paper-alt hover:border-ink rounded-xs text-ink"
                      >
                        <span className="font-semibold">{item.keyword}</span>
                        <span className="text-[10px] text-ink-muted font-bold">
                          ({item.count})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Reporting Newsrooms */}
              {data.top_sources.length > 0 && (
                <div>
                  <h3 className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary mb-2 flex items-center gap-1.5">
                    <Globe2 size={13} />
                    <span>Primary Reporting Newsrooms</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {data.top_sources.map((src, idx) => (
                      <div
                        key={idx}
                        className="p-2 border border-paper-border rounded-xs bg-paper-alt flex items-center justify-between"
                      >
                        <span className="font-bold text-ink truncate max-w-[150px]">
                          {src.source_name}
                        </span>
                        <span className="text-[10px] font-mono text-ink-muted">
                          {src.count} wires
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chronological Intelligence Dispatches */}
              <div>
                <h3 className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText size={13} />
                    <span>Historical Intelligence Archive ({data.articles.length})</span>
                  </span>
                  <span className="text-[10px] font-mono text-ink-muted">
                    Click to Open on Desk
                  </span>
                </h3>
                <div className="space-y-3">
                  {data.articles.map((art) => (
                    <article
                      key={art.id}
                      onClick={() => {
                        selectArticleById(art.id);
                        onClose();
                      }}
                      className="p-3.5 border border-paper-border hover:border-ink bg-paper rounded-xs transition-all shadow-2xs hover:shadow-sm cursor-pointer group"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted mb-1.5 border-b border-paper-border pb-1">
                        <span className="font-bold uppercase text-accent">
                          {art.source.name} · {art.source.country}
                        </span>
                        <span>
                          {art.published_at ? new Date(art.published_at).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-sm leading-snug text-ink group-hover:text-accent transition-colors mb-1.5">
                        {art.title_english}
                      </h4>
                      {art.summary && (
                        <p className="font-body text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                          {art.summary}
                        </p>
                      )}
                      <div className="mt-2 pt-1 border-t border-paper-border flex justify-between items-center text-[10px] font-mono text-ink-muted">
                        <span className="flex items-center gap-1 text-accent font-bold">
                          Urgency Score: {art.breaking_score}
                        </span>
                        <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-ink">
                          <span>Read Dispatch</span>
                          <ArrowRight size={10} />
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
};
