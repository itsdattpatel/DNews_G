/**
 * frontend/src/components/entities/EntityRelationshipDesk.tsx
 * Interactive Broadsheet Geopolitical Entity Network Desk (PRD Master Expansion #20).
 * Visualizes relational co-occurrences of key figures, nations, organizations,
 * and treaties across world dispatches with clickable network nodes and dossier inspection.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { EntityDossierDrawer } from '../article/EntityDossierDrawer';
import type { EntityGraphResponse, EntityGraphNode } from '../../types';
import {
  Share2,
  ArrowLeft,
  Search,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export const EntityRelationshipDesk: React.FC = () => {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [data, setData] = useState<EntityGraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeNode, setActiveNode] = useState<EntityGraphNode | null>(null);
  const [dossierEntity, setDossierEntity] = useState<string | null>(null);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/entities/graph');
      if (res.ok) {
        const json: EntityGraphResponse = await res.json();
        setData(json);
        if (json.nodes && json.nodes.length > 0) {
          setActiveNode(json.nodes[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load entity network graph:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const filteredNodes = useMemo(() => {
    if (!data?.nodes) return [];
    return data.nodes.filter((n) => {
      const matchesType = selectedType === 'all' || n.type === selectedType;
      const matchesSearch =
        !searchFilter.trim() || n.name.toLowerCase().includes(searchFilter.toLowerCase().trim());
      return matchesType && matchesSearch;
    });
  }, [data, selectedType, searchFilter]);

  const activeLinks = useMemo(() => {
    if (!activeNode || !data?.links) return [];
    return data.links.filter(
      (l) =>
        l.source.toLowerCase() === activeNode.name.toLowerCase() ||
        l.target.toLowerCase() === activeNode.name.toLowerCase()
    );
  }, [activeNode, data]);

  const handleSelectNode = (node: EntityGraphNode) => {
    triggerHaptic('selection');
    setActiveNode(node);
  };

  return (
    <div
      id="entity-relationship-desk"
      className="w-full h-full min-h-0 min-w-0 overflow-y-auto bg-paper text-ink p-4 sm:p-8 lg:p-12 select-none"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-ink mb-6">
        <div>
          <button
            id="btn-return-reader"
            onClick={() => {
              triggerHaptic('light');
              setCurrentView('reader');
            }}
            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-ink-secondary hover:text-ink mb-2 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Return to Dispatch Reader</span>
          </button>
          <div className="flex items-center gap-2">
            <Share2 size={22} className="text-accent" />
            <h1 className="font-masthead text-2xl sm:text-3xl font-bold uppercase tracking-tight text-ink">
              Geopolitical &amp; Entity Network Map
            </h1>
          </div>
          <p className="font-serif italic text-xs sm:text-sm text-ink-secondary mt-1">
            Dynamic relational topology connecting nations, leaders, organizations, and global agreements.
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchGraph}
          disabled={loading}
          className="px-3.5 py-1.5 border border-paper-border hover:border-ink bg-paper-alt rounded-xs font-mono text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Topology</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Entities' },
            { id: 'nation', label: 'Nations' },
            { id: 'leader', label: 'Figures & Leaders' },
            { id: 'organization', label: 'Organizations' },
            { id: 'topic', label: 'Topics' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic('selection');
                setSelectedType(tab.id);
              }}
              className={`px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider rounded-xs border transition-colors cursor-pointer whitespace-nowrap ${
                selectedType === tab.id
                  ? 'bg-ink text-paper border-ink shadow-xs'
                  : 'bg-paper-alt text-ink-secondary border-paper-border hover:border-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search network nodes..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-mono text-xs text-ink outline-none"
          />
        </div>
      </div>

      {/* Main Network Layout: Canvas/SVG Graph (Left 8 cols) & Dossier Preview (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-16">
        {/* Network Interactive Surface */}
        <div className="lg:col-span-8 border-2 border-ink bg-paper-alt rounded-xs p-4 sm:p-6 shadow-xs relative min-h-[460px] flex flex-col justify-between overflow-hidden">
          {/* Canvas Topology Frame */}
          <div className="relative flex-1 flex flex-wrap items-center justify-center gap-3 p-4">
            {filteredNodes.map((node, index) => {
              const isSelected = activeNode?.id === node.id;
              const isConnected =
                activeLinks.some(
                  (l) =>
                    l.source.toLowerCase() === node.name.toLowerCase() ||
                    l.target.toLowerCase() === node.name.toLowerCase()
                );

              return (
                <button
                  key={node.id}
                  onClick={() => handleSelectNode(node)}
                  className={`group relative p-3 rounded-xs border transition-all cursor-pointer flex items-center gap-2.5 ${
                    isSelected
                      ? 'border-2 border-ink bg-paper shadow-md scale-105 z-20'
                      : isConnected
                      ? 'border-accent bg-accent/10 z-10'
                      : 'border-paper-border bg-paper hover:border-ink/60 hover:shadow-xs'
                  }`}
                  style={{
                    animationDelay: `${index * 30}ms`,
                  }}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      node.type === 'nation'
                        ? 'bg-blue-700'
                        : node.type === 'leader'
                        ? 'bg-amber-700'
                        : node.type === 'organization'
                        ? 'bg-emerald-700'
                        : 'bg-ink'
                    }`}
                  />
                  <div className="text-left">
                    <span className="font-serif font-bold text-xs sm:text-sm text-ink block line-clamp-1">
                      {node.name}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
                      {node.mentions} mentions · {node.type}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Network Legend Footer */}
          <div className="pt-3 border-t border-paper-border flex flex-wrap items-center justify-between gap-3 text-ink-muted font-mono text-[10px]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-700" />
                <span>Nations</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-700" />
                <span>Key Figures</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-700" />
                <span>Organizations</span>
              </span>
            </div>
            <span>Click any node to reveal dossier &amp; relations</span>
          </div>
        </div>

        {/* Selected Entity Dossier Card (Right Column) */}
        <div className="lg:col-span-4">
          {activeNode ? (
            <div className="border-2 border-ink bg-paper-alt rounded-xs p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-paper-border">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                  Active Topology Node
                </span>
                <h3 className="font-masthead text-2xl font-bold uppercase text-ink mt-1">
                  {activeNode.name}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded-xs bg-ink text-paper font-bold uppercase">
                    {activeNode.type}
                  </span>
                  <span className="text-ink-secondary">
                    {activeNode.mentions} Dispatches Recorded
                  </span>
                </div>
              </div>

              {/* Direct Co-Occurrences */}
              <div>
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ink mb-2">
                  Top Co-Occurring Entities ({activeLinks.length})
                </h4>
                {activeLinks.length > 0 ? (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {activeLinks.map((link, idx) => {
                      const other =
                        link.source.toLowerCase() === activeNode.name.toLowerCase()
                          ? link.target
                          : link.source;
                      return (
                        <div
                          key={idx}
                          className="p-2 border border-paper-border bg-paper rounded-xs flex items-center justify-between text-xs font-serif"
                        >
                          <span className="font-semibold text-ink">{other}</span>
                          <span className="font-mono text-[10px] text-ink-muted">
                            {link.weight} joint wire{link.weight > 1 ? 's' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="font-serif italic text-xs text-ink-muted">
                    No immediate primary co-occurrences in current sample.
                  </p>
                )}
              </div>

              {/* Action: Open Full Deep Dossier */}
              <button
                id="btn-open-entity-dossier"
                onClick={() => {
                  triggerHaptic('bookmark');
                  setDossierEntity(activeNode.name);
                }}
                className="w-full py-2.5 border-2 border-ink bg-ink text-paper font-mono text-xs font-bold uppercase tracking-wider rounded-xs hover:bg-paper hover:text-ink transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <ExternalLink size={13} />
                <span>Examine Historical Dossier</span>
              </button>
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-paper-border text-center font-serif italic text-ink-muted">
              Select an entity node to inspect connections
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Full Dossier Drawer */}
      <EntityDossierDrawer
        entityName={dossierEntity}
        onClose={() => setDossierEntity(null)}
      />
    </div>
  );
};
