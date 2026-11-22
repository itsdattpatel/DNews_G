/**
 * frontend/src/components/mindmap/KnowledgeMindMapModal.tsx
 * Saved Knowledge Mind-Map & Concept Graph (PRD Master Expansion #39).
 * Visually networks bookmarked articles, editorial margin notes, and wisdom quotes
 * into interconnected broadsheet concept clusters.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { X, Network, Bookmark, Sparkles, Quote } from 'lucide-react';

interface KnowledgeMindMapModalProps {
  onClose?: () => void;
}

interface MindNode {
  id: string;
  label: string;
  cluster: string;
  type: 'article' | 'note' | 'concept';
  articleId?: number;
}

export const KnowledgeMindMapModal: React.FC<KnowledgeMindMapModalProps> = ({ onClose }) => {
  const isKnowledgeMindMapOpen = useAppStore((s) => s.isKnowledgeMindMapOpen);
  const setKnowledgeMindMapOpen = useAppStore((s) => s.setKnowledgeMindMapOpen);
  const articles = useAppStore((s) => s.articles);
  const articleNotes = useAppStore((s) => s.articleNotes);
  const setSelectedArticle = useAppStore((s) => s.setSelectedArticle);
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [activeNode, setActiveNode] = useState<MindNode | null>(null);

  const handleClose = () => {
    triggerHaptic('light');
    if (onClose) onClose();
    setKnowledgeMindMapOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isKnowledgeMindMapOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKnowledgeMindMapOpen]);

  // Construct mind nodes from bookmarked articles and notes
  const nodes: MindNode[] = useMemo(() => {
    const list: MindNode[] = [];

    // Articles (prefer bookmarked or recent)
    const saved = articles.filter((a) => a.bookmarked);
    const pool = saved.length > 0 ? saved : articles.slice(0, 8);

    pool.forEach((a) => {
      const cat = a.categories?.[0] || 'Geopolitics';
      list.push({
        id: `art-${a.id}`,
        label: a.title_english,
        cluster: cat,
        type: 'article',
        articleId: a.id,
      });

      // Include notes attached to this article
      const notes = articleNotes[a.id] || [];
      notes.forEach((note, nIdx) => {
        list.push({
          id: `note-${a.id}-${nIdx}`,
          label: note.text,
          cluster: cat,
          type: 'note',
          articleId: a.id,
        });
      });
    });

    // Philosophical core concept anchors
    list.push({ id: 'concept-1', label: 'Multilateral Diplomacy', cluster: 'Geopolitics', type: 'concept' });
    list.push({ id: 'concept-2', label: 'Ecosystem Equilibrium', cluster: 'Environment', type: 'concept' });
    list.push({ id: 'concept-3', label: 'Monetary Liquidity', cluster: 'Economy', type: 'concept' });

    return list;
  }, [articles, articleNotes]);

  const clusters = ['all', 'Geopolitics', 'Environment', 'Economy', 'Science', 'World'];

  const filteredNodes = useMemo(() => {
    if (selectedCluster === 'all') return nodes;
    return nodes.filter((n) => n.cluster.toLowerCase() === selectedCluster.toLowerCase());
  }, [nodes, selectedCluster]);

  if (!isKnowledgeMindMapOpen) return null;

  return (
    <div
      id="knowledge-mindmap-modal"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs select-none animate-fadeIn"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-paper text-ink border-2 border-ink p-5 sm:p-8 rounded-xs shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Masthead Header */}
        <div className="flex items-start justify-between pb-3 border-b-2 border-ink">
          <div>
            <div className="flex items-center gap-2">
              <Network size={22} className="text-accent" />
              <h2 className="font-masthead text-xl sm:text-2xl font-bold uppercase tracking-tight text-ink">
                Saved Knowledge Mind-Map &amp; Concept Graph
              </h2>
            </div>
            <p className="font-serif italic text-xs sm:text-sm text-ink-secondary mt-1">
              Topological synthesis linking saved news dispatches, marginal notes, and core themes.
            </p>
          </div>
          <button
            id="btn-close-knowledge-mindmap"
            onClick={handleClose}
            className="p-1 border border-paper-border hover:border-ink rounded-xs text-ink cursor-pointer transition-colors"
            title="Close Mind-Map (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cluster Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {clusters.map((c) => (
            <button
              key={c}
              onClick={() => {
                triggerHaptic('selection');
                setSelectedCluster(c);
              }}
              className={`px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider rounded-xs border transition-colors cursor-pointer whitespace-nowrap ${
                selectedCluster === c
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper-alt text-ink-secondary border-paper-border hover:border-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Graph Visual Surface */}
        <div className="p-6 border-2 border-ink bg-paper-alt rounded-xs min-h-[360px] flex flex-wrap items-center justify-center gap-3 relative overflow-hidden">
          {filteredNodes.map((node) => {
            const isSelected = activeNode?.id === node.id;
            return (
              <button
                key={node.id}
                onClick={() => {
                  triggerHaptic('selection');
                  setActiveNode(node);
                  if (node.articleId) {
                    const found = articles.find((a) => a.id === node.articleId);
                    if (found) setSelectedArticle(found);
                  }
                }}
                className={`p-3 rounded-xs border text-left max-w-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'border-2 border-ink bg-paper shadow-md scale-105 z-10'
                    : 'border-paper-border bg-paper hover:border-ink'
                }`}
              >
                <div className="flex items-center gap-1.5 text-ink-muted font-mono text-[9px] uppercase font-bold mb-1">
                  {node.type === 'article' ? (
                    <>
                      <Bookmark size={10} className="text-accent" />
                      <span>Dispatch Node · {node.cluster}</span>
                    </>
                  ) : node.type === 'note' ? (
                    <>
                      <Quote size={10} className="text-amber-700" />
                      <span>Marginal Note</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={10} className="text-blue-700" />
                      <span>Thematic Anchor</span>
                    </>
                  )}
                </div>
                <p className="font-serif font-bold text-xs sm:text-sm text-ink line-clamp-2 leading-snug">
                  {node.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-paper-border text-ink-muted font-mono text-[10px]">
          <span>{filteredNodes.length} Interconnected Knowledge Nodes Plotted</span>
          <button
            onClick={handleClose}
            className="px-3 py-1.5 border border-ink bg-ink text-paper rounded-xs font-bold uppercase hover:bg-paper hover:text-ink transition-colors cursor-pointer"
          >
            Dismiss Mind-Map
          </button>
        </div>
      </div>
    </div>
  );
};
