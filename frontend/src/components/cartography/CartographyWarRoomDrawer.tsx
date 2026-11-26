/**
 * frontend/src/components/cartography/CartographyWarRoomDrawer.tsx
 * Phase H: Cartography, Chokepoints & Data Markets (Features 29-35)
 * Desktop & Mobile Responsive Newspaper War Room Desk.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Anchor,
  Thermometer,
  GitBranch,
  HeartPulse,
  Landmark,
  Plane,
  RefreshCw,
  Globe2,
  AlertTriangle,
  Compass,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { Article } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';

export type CartographyTab =
  | 'markets'
  | 'chokepoints'
  | 'climate'
  | 'supply_chain'
  | 'epidemics'
  | 'elections'
  | 'flights';

interface CartographyWarRoomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeArticle: Article | null;
  initialTab?: CartographyTab;
}

export const CartographyWarRoomDrawer: React.FC<CartographyWarRoomDrawerProps> = ({
  isOpen,
  onClose,
  activeArticle,
  initialTab = 'markets',
}) => {
  const [activeTab, setActiveTab] = useState<CartographyTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showMastheadTicker = useAppStore((s) => s.showMastheadTicker);
  const toggleMastheadTicker = useAppStore((s) => s.toggleMastheadTicker);
  const setGlobeOpen = useAppStore((s) => s.setGlobeOpen);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);

  // Tab #29: Markets
  const [tickers, setTickers] = useState<any[]>([]);
  // Tab #30: Chokepoints
  const [chokepoints, setChokepoints] = useState<any[]>([]);
  const [totalTradePct, setTotalTradePct] = useState<number>(0);
  // Tab #31: Climate
  const [anomalies, setAnomalies] = useState<any[]>([]);
  // Tab #32: Supply Chain DAG
  const [supplyChain, setSupplyChain] = useState<any | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>('');
  // Tab #33: Epidemics
  const [bulletins, setBulletins] = useState<any[]>([]);
  // Tab #34: Parliament Simulator
  const [presets, setPresets] = useState<any[]>([]);
  const [selectedPresetSlug, setSelectedPresetSlug] = useState<string>('bundestag');
  const [simMethod, setSimMethod] = useState<'dhondt' | 'sainte_lague'>('dhondt');
  const [simTotalSeats, setSimTotalSeats] = useState<number>(630);
  const [simThresholdPct, setSimThresholdPct] = useState<number>(5.0);
  const [simParties, setSimParties] = useState<Array<{ id: string; name: string; color: string; votePct: number }>>([]);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [coalitionIds, setCoalitionIds] = useState<string[]>([]);
  // Tab #35: Diplomatic Flights
  const [flights, setFlights] = useState<any[]>([]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    loadTab(activeTab);
  }, [isOpen, activeTab, activeArticle?.id]);

  const loadTab = async (tab: CartographyTab) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'markets') {
        const res = await api.getMarketTickers(false);
        setTickers(res.tickers);
      } else if (tab === 'chokepoints') {
        const res = await api.getMaritimeChokepoints();
        setChokepoints(res.chokepoints);
        setTotalTradePct(res.totalGlobalTradePctMonitored);
      } else if (tab === 'climate') {
        const res = await api.getClimateAnomalies();
        setAnomalies(res.anomalies);
      } else if (tab === 'supply_chain') {
        const res = await api.getSupplyChainDag({
          articleId: selectedSector ? undefined : activeArticle?.id,
          sector: selectedSector || undefined,
        });
        setSupplyChain(res);
      } else if (tab === 'epidemics') {
        const res = await api.getEpidemiologicalBulletins();
        setBulletins(res.bulletins);
      } else if (tab === 'elections') {
        const res = await api.getElectoralPresets();
        setPresets(res.presets);
        if (res.presets.length > 0 && simParties.length === 0) {
          const initial = res.presets[0]!;
          setSelectedPresetSlug(initial.slug);
          setSimTotalSeats(initial.total_seats);
          setSimThresholdPct(initial.threshold_pct);
          setSimParties(initial.parties);
          setCoalitionIds(initial.parties.slice(0, 2).map((p: any) => p.id));
          const sim = await api.simulateElection({
            totalSeats: initial.total_seats,
            thresholdPct: initial.threshold_pct,
            method: simMethod,
            parties: initial.parties,
          });
          setSimResult(sim);
        }
      } else if (tab === 'flights') {
        const res = await api.getDiplomaticFlights();
        setFlights(res.flights);
      }
    } catch (err: any) {
      setError(err?.message || 'Telegraphic cartography feed interrupted.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshMarkets = async () => {
    triggerHaptic('selection');
    setLoading(true);
    try {
      const res = await api.getMarketTickers(true);
      setTickers(res.tickers);
      useAppStore.setState({ marketTickers: res.tickers });
    } catch {
      setError('Failed to tick live commodity market feed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSector = async (sectorLabel: string) => {
    triggerHaptic('selection');
    setSelectedSector(sectorLabel);
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSupplyChainDag({ sector: sectorLabel || undefined, articleId: sectorLabel ? undefined : activeArticle?.id });
      setSupplyChain(res);
    } catch {
      setError('Unable to synthesize supply chain DAG.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = async (slug: string) => {
    triggerHaptic('selection');
    const preset = presets.find((p) => p.slug === slug);
    if (!preset) return;
    setSelectedPresetSlug(slug);
    setSimTotalSeats(preset.total_seats);
    setSimThresholdPct(preset.threshold_pct);
    setSimParties(preset.parties);
    setCoalitionIds(preset.parties.slice(0, 2).map((p: any) => p.id));
    const sim = await api.simulateElection({
      totalSeats: preset.total_seats,
      thresholdPct: preset.threshold_pct,
      method: simMethod,
      parties: preset.parties,
    });
    setSimResult(sim);
  };

  const handleRunSimulation = async (
    nextParties = simParties,
    nextMethod = simMethod,
    nextThreshold = simThresholdPct
  ) => {
    try {
      const sim = await api.simulateElection({
        totalSeats: simTotalSeats,
        thresholdPct: nextThreshold,
        method: nextMethod,
        parties: nextParties,
      });
      setSimResult(sim);
    } catch {
      setError('Parliamentary apportionment engine encountered an arithmetic error.');
    }
  };

  const toggleCoalitionParty = (id: string) => {
    triggerHaptic('selection');
    setCoalitionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const coalitionSeats = useMemo(() => {
    if (!simResult?.results) return 0;
    return simResult.results
      .filter((r: any) => coalitionIds.includes(r.id))
      .reduce((sum: number, r: any) => sum + r.seats, 0);
  }, [simResult, coalitionIds]);

  // Compute semicircular hemicycle coordinates for Parliament Simulator SVG (#34)
  const hemicycleDots = useMemo(() => {
    if (!simResult?.results) return [];
    const total = simResult.results.reduce((s: number, r: any) => s + r.seats, 0);
    if (total === 0) return [];

    // Cap rendered dots at 180 proportional dots so the hemicycle stays crisp and legible
    const renderDotsCount = Math.min(total, 160);
    const scaleFactor = renderDotsCount / total;
    const seatColors: string[] = [];
    for (const party of simResult.results) {
      const count = Math.round(party.seats * scaleFactor);
      for (let i = 0; i < count; i++) {
        seatColors.push(party.color);
      }
    }
    while (seatColors.length < renderDotsCount) {
      seatColors.push(simResult.results[0]?.color || '#1A1208');
    }
    if (seatColors.length > renderDotsCount) {
      seatColors.length = renderDotsCount;
    }

    const rows = 5;
    const coords: Array<{ x: number; y: number; color: string }> = [];
    const cx = 180;
    const cy = 165;
    const minRadius = 60;
    const rowStep = 19;

    // Distribute angles from PI (left) to 0 (right) across concentric arcs
    const dotsPerRow = Math.ceil(renderDotsCount / rows);
    let idx = 0;
    for (let col = 0; col < dotsPerRow; col++) {
      for (let r = 0; r < rows; r++) {
        if (idx >= seatColors.length) break;
        const angle = Math.PI - (col / Math.max(1, dotsPerRow - 1)) * Math.PI;
        const radius = minRadius + r * rowStep;
        coords.push({
          x: cx + radius * Math.cos(angle),
          y: cy - radius * Math.sin(angle),
          color: seatColors[idx]!,
        });
        idx++;
      }
    }
    return coords;
  }, [simResult]);

  if (!isOpen) return null;

  const handleOpenGlobeLayer = () => {
    triggerHaptic('selection');
    onClose();
    setGlobeOpen(true);
    setCurrentView('globe');
  };

  const handleFilterChokepointWire = (keywords: string[]) => {
    triggerHaptic('selection');
    if (keywords.length > 0) {
      setSearchQuery(keywords[0]!);
    }
    onClose();
    setCurrentView('reader');
  };

  return (
    <div
      id="cartography-war-room-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cartography-desk-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex flex-col w-full max-w-5xl h-[92vh] max-h-[860px] bg-[var(--color-paper)] border-2 border-[var(--color-ink)] shadow-overlay overflow-hidden rounded-xs text-[var(--color-ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Newspaper Masthead Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-[var(--color-paper-alt)] border-b-2 border-[var(--color-ink)] shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="border border-[var(--color-accent)] text-[var(--color-accent)] px-2 py-0.5 text-[10px] sm:text-xs font-mono uppercase tracking-widest font-bold shrink-0">
              Cartographic War Room
            </span>
            <h2 id="cartography-desk-title" className="text-base sm:text-xl font-serif font-black tracking-tight truncate">
              CARTOGRAPHY, CHOKEPOINTS &amp; DATA MARKETS
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenGlobeLayer}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 border border-[var(--color-ink)] bg-[var(--color-paper)] hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)] text-xs font-mono uppercase font-bold transition-colors cursor-pointer"
              title="Open 3D Global News Radar"
            >
              <Globe2 size={13} />
              <span>3D Globe</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                onClose();
              }}
              aria-label="Close Cartography War Room"
              className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-border)]/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 7-Tab Navigation Bar */}
        <nav
          aria-label="Cartography Desks"
          data-lenis-prevent="true"
          className="flex overflow-x-auto no-scrollbar border-b border-[var(--color-paper-border)] bg-[var(--color-paper)] text-xs font-mono uppercase tracking-wider divide-x divide-[var(--color-paper-border)] shrink-0"
        >
          {[
            { id: 'markets', label: '#29 Market Ticker', icon: TrendingUp },
            { id: 'chokepoints', label: '#30 Chokepoints', icon: Anchor },
            { id: 'climate', label: '#31 Climate Overlay', icon: Thermometer },
            { id: 'supply_chain', label: '#32 Supply Chain DAG', icon: GitBranch },
            { id: 'epidemics', label: '#33 Health Tracker', icon: HeartPulse },
            { id: 'elections', label: '#34 Parliament Sim', icon: Landmark },
            { id: 'flights', label: '#35 VIP Flights', icon: Plane },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setActiveTab(tab.id as CartographyTab);
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
          {/* Loading Skeleton State */}
          {loading && (
            <div className="space-y-4 animate-pulse py-6" aria-label="Loading War Room Telemetry">
              <div className="h-4 w-48 bg-[var(--color-paper-border)] rounded-xs" />
              <div className="h-8 w-2/3 bg-[var(--color-paper-border)] rounded-xs" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="h-28 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)]" />
                <div className="h-28 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)]" />
              </div>
              <p className="font-mono text-xs text-[var(--color-ink-muted)] uppercase tracking-widest">
                Polling satellite, maritime &amp; market telemetry...
              </p>
            </div>
          )}

          {/* Telegraphic Error State */}
          {!loading && error && (
            <div className="border-2 border-[var(--color-accent)] bg-[var(--color-paper-alt)] p-5 space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-[var(--color-accent)]">
                <AlertTriangle size={16} />
                <span>[DISPATCH INTERRUPTED: WIRE DISCONNECTED]</span>
              </div>
              <p className="font-serif text-sm text-[var(--color-ink)]">{error}</p>
              <button
                type="button"
                onClick={() => loadTab(activeTab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--color-ink)] bg-[var(--color-paper)] text-xs font-mono font-bold uppercase cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Retry Telemetry Handshake</span>
              </button>
            </div>
          )}

          {/* TAB #29: MASTHEAD COMMODITY & CURRENCY TICKER TAPE */}
          {!loading && !error && activeTab === 'markets' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-paper-border)] pb-3">
                <div>
                  <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                    Feature #29 · Macroeconomic Wire
                  </span>
                  <h3 className="text-2xl font-serif font-bold">
                    Masthead Commodity &amp; Currency Exchange Tape
                  </h3>
                  <p className="text-sm text-[var(--color-ink-secondary)]">
                    Real-time spot benchmark feed for strategic commodities, sovereign FX pairs, and digital assets.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRefreshMarkets}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Tick Quotes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      toggleMastheadTicker();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    <span>{showMastheadTicker ? 'Tape: Visible' : 'Tape: Hidden'}</span>
                  </button>
                </div>
              </div>

              {tickers.length === 0 ? (
                <div className="border border-dashed border-[var(--color-paper-border)] p-8 text-center space-y-2">
                  <p className="font-serif italic text-[var(--color-ink-secondary)]">
                    The Wire Tape is silent. No market quotations received yet.
                  </p>
                  <button
                    type="button"
                    onClick={handleRefreshMarkets}
                    className="px-3 py-1.5 border border-[var(--color-ink)] text-xs font-mono font-bold uppercase cursor-pointer"
                  >
                    Poll Exchange Wire
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {tickers.map((t) => {
                    const isPositive = t.change_pct >= 0;
                    return (
                      <div
                        key={t.symbol}
                        className="p-3.5 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] border-t-2 border-t-[var(--color-ink)] flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-[var(--color-ink)]">{t.symbol}</span>
                          <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 border border-[var(--color-paper-border)] bg-[var(--color-paper)] text-[var(--color-ink-secondary)]">
                            {t.category}
                          </span>
                        </div>
                        <div>
                          <div className="font-serif text-sm font-bold text-[var(--color-ink-secondary)]">{t.name}</div>
                          <div className="font-mono text-xl font-black tabular-nums text-[var(--color-ink)] mt-0.5">
                            {t.price >= 100 ? t.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : t.price.toFixed(t.price < 10 ? 4 : 2)}
                            <span className="text-[10px] font-normal text-[var(--color-ink-muted)] ml-1">{t.unit}</span>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 font-mono text-xs font-bold ${isPositive ? 'text-[var(--color-positive)]' : 'text-[var(--color-accent)]'}`}>
                          {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          <span>
                            {isPositive ? '+' : ''}{t.change_24h} ({isPositive ? '+' : ''}{t.change_pct.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB #30: MARITIME CHOKEPOINTS & SEA-LANE MAP */}
          {!loading && !error && activeTab === 'chokepoints' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-paper-border)] pb-3">
                <div>
                  <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                    Feature #30 · Maritime Cartography
                  </span>
                  <h3 className="text-2xl font-serif font-bold">
                    Strategic Maritime Chokepoints &amp; Sea-Lanes
                  </h3>
                  <p className="text-sm text-[var(--color-ink-secondary)]">
                    Monitoring <strong>{totalTradePct}%</strong> of global seaborne commerce across strategic straits and canals.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenGlobeLayer}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-mono font-bold uppercase cursor-pointer shrink-0"
                >
                  <Compass size={13} />
                  <span>Inspect Chokepoints on Globe</span>
                </button>
              </div>

              {chokepoints.length === 0 ? (
                <div className="border border-dashed border-[var(--color-paper-border)] p-8 text-center">
                  <p className="font-serif italic text-[var(--color-ink-secondary)]">
                    No maritime corridor buoys reporting in this sector.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chokepoints.map((cp) => {
                    const isSevere = cp.status === 'Disrupted' || cp.status === 'Elevated Tension';
                    return (
                      <div
                        key={cp.slug}
                        className="p-4 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] border-l-4 flex flex-col justify-between gap-3"
                        style={{ borderLeftColor: isSevere ? 'var(--color-accent)' : 'var(--color-positive)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                              {cp.region} · {cp.lat.toFixed(2)}°, {cp.lng.toFixed(2)}°
                            </div>
                            <h4 className="font-serif text-lg font-bold text-[var(--color-ink)]">{cp.name}</h4>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${
                              isSevere
                                ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-paper)]'
                                : 'border-[var(--color-positive)] text-[var(--color-positive)] bg-[var(--color-paper)]'
                            }`}
                          >
                            {cp.status}
                          </span>
                        </div>

                        <p className="font-serif text-xs leading-relaxed text-[var(--color-ink-secondary)]">
                          {cp.incident_summary}
                        </p>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--color-paper-border)] font-mono text-[11px]">
                          <div>
                            <div className="text-[9px] text-[var(--color-ink-muted)] uppercase">Risk Index</div>
                            <div className="font-bold">{cp.risk_level}/100</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-[var(--color-ink-muted)] uppercase">Daily Vessels</div>
                            <div className="font-bold">{cp.daily_transits}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-[var(--color-ink-muted)] uppercase">Global Share</div>
                            <div className="font-bold">{cp.global_trade_pct}%</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-paper-border)]">
                          <span className="font-mono text-[10px] text-[var(--color-ink-secondary)]">
                            {cp.matchedDispatches} matched wire cables
                          </span>
                          <button
                            type="button"
                            onClick={() => handleFilterChokepointWire(cp.keywords || [])}
                            className="text-xs font-mono font-bold uppercase text-[var(--color-accent)] hover:underline cursor-pointer"
                          >
                            Filter Trade Wire →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB #31: CLIMATE ANOMALY & EXTREME WEATHER OVERLAY */}
          {!loading && !error && activeTab === 'climate' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-paper-border)] pb-3">
                <div>
                  <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                    Feature #31 · Atmospheric Telemetry
                  </span>
                  <h3 className="text-2xl font-serif font-bold">
                    NOAA &amp; Copernicus Climate Anomaly Overlays
                  </h3>
                  <p className="text-sm text-[var(--color-ink-secondary)]">
                    Thermal deviations, cryosphere ice deficits, and cyclonic monsoon baselines mapped onto the global desk.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenGlobeLayer}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-mono font-bold uppercase cursor-pointer shrink-0"
                >
                  <Globe2 size={13} />
                  <span>View Layer on Globe</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {anomalies.map((an) => (
                  <div
                    key={an.slug}
                    className="p-4 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 bg-[var(--color-paper)] border border-[var(--color-paper-border)]">
                        {an.anomaly_type}
                      </span>
                      <span className="font-mono text-xs font-bold text-[var(--color-accent)]">
                        +{an.delta_celsius.toFixed(2)}°C Anomaly · {an.severity}
                      </span>
                    </div>
                    <h4 className="font-serif text-lg font-bold">{an.title}</h4>
                    <div className="font-mono text-[11px] text-[var(--color-ink-muted)]">
                      Sector: {an.region} ({an.lat.toFixed(1)}°, {an.lng.toFixed(1)}°)
                    </div>
                    <p className="font-serif text-xs text-[var(--color-ink-secondary)] leading-relaxed">
                      {an.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB #32: SUPPLY CHAIN DISRUPTION FLOWCHART (SVG DAG) */}
          {!loading && !error && activeTab === 'supply_chain' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-paper-border)] pb-3">
                <div>
                  <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                    Feature #32 · Downstream Impact Graph
                  </span>
                  <h3 className="text-2xl font-serif font-bold">
                    Supply Chain Disruption Flowchart (DAG)
                  </h3>
                  <p className="text-sm text-[var(--color-ink-secondary)]">
                    Traces upstream extraction, maritime chokepoints, fabrication tiers, and retail shelf price lag.
                  </p>
                </div>

                {/* Sector Selector */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Article Context', val: '' },
                    { label: 'Crude Oil', val: 'Crude Oil' },
                    { label: 'Semiconductors', val: 'Semiconductors' },
                    { label: 'Grain & Food', val: 'Wheat Grain' },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => handleSelectSector(s.val)}
                      className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase border cursor-pointer ${
                        selectedSector === s.val
                          ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]'
                          : 'bg-[var(--color-paper-alt)] text-[var(--color-ink-secondary)] border-[var(--color-paper-border)]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {supplyChain && (
                <div className="space-y-4">
                  <div className="p-3 bg-[var(--color-paper-alt)] border-l-4 border-[var(--color-accent)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-mono text-[10px] uppercase font-bold text-[var(--color-accent)]">
                        Active Sector Model: {supplyChain.sector}
                      </div>
                      <div className="font-serif text-sm font-bold">
                        Critical Bottleneck: {supplyChain.criticalBottleneck}
                      </div>
                    </div>
                    <div className="font-mono text-xs font-bold px-2.5 py-1 bg-[var(--color-paper)] border border-[var(--color-paper-border)] shrink-0">
                      Est. Retail Lag: {supplyChain.estimatedRetailLagWeeks} Weeks
                    </div>
                  </div>

                  {/* Interactive SVG DAG Visualization */}
                  <div className="w-full overflow-x-auto bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] p-4">
                    <svg
                      viewBox="0 0 920 245"
                      className="w-full min-w-[700px] h-auto"
                      role="img"
                      aria-label="Supply Chain Directed Acyclic Graph"
                    >
                      <defs>
                        <marker
                          id="arrowHead"
                          markerWidth="8"
                          markerHeight="8"
                          refX="7"
                          refY="4"
                          orient="auto"
                        >
                          <path d="M0,0 L8,4 L0,8 Z" fill="#C0392B" />
                        </marker>
                      </defs>

                      {/* Edges & Staggered Callout Labels (Zero card overlap) */}
                      {supplyChain.edges.map((edge: any, idx: number) => {
                        const x1 = 185 + idx * 235;
                        const x2 = 240 + idx * 235;
                        const midX = (x1 + x2) / 2;
                        const isTopCallout = idx % 2 === 0;
                        const labelY = isTopCallout ? 20 : 212;
                        const lineYStart = isTopCallout ? 28 : 196;
                        return (
                          <g key={`${edge.from}-${edge.to}`}>
                            <line
                              x1={x1}
                              y1={110}
                              x2={x2}
                              y2={110}
                              stroke="#C0392B"
                              strokeWidth="2.5"
                              markerEnd="url(#arrowHead)"
                            />
                            <line
                              x1={midX}
                              y1={110}
                              x2={midX}
                              y2={lineYStart}
                              stroke="#9A8878"
                              strokeWidth="1"
                              strokeDasharray="3 2"
                            />
                            <rect
                              x={midX - 88}
                              y={labelY - 12}
                              width="176"
                              height="18"
                              fill="var(--color-paper)"
                              stroke="var(--color-paper-border)"
                              strokeWidth="1"
                            />
                            <text
                              x={midX}
                              y={labelY}
                              textAnchor="middle"
                              className="fill-[var(--color-ink-secondary)] text-[9.5px] font-mono font-bold"
                            >
                              {edge.label.length > 28 ? `${edge.label.slice(0, 26)}…` : edge.label}
                            </text>
                          </g>
                        );
                      })}

                      {/* Tier Nodes */}
                      {supplyChain.nodes.map((node: any, idx: number) => {
                        const x = 15 + idx * 235;
                        const isCritical = node.risk === 'Critical';
                        return (
                          <g key={node.id} transform={`translate(${x}, 50)`}>
                            <rect
                              width="170"
                              height="120"
                              fill="var(--color-paper)"
                              stroke={isCritical ? '#C0392B' : '#1A1208'}
                              strokeWidth={isCritical ? '2.5' : '1.5'}
                            />
                            <rect
                              width="170"
                              height="24"
                              fill={isCritical ? '#C0392B' : '#1A1208'}
                            />
                            <text
                              x="10"
                              y="16"
                              fill="#FAF7F0"
                              className="text-[10px] font-mono font-bold uppercase"
                            >
                              TIER {node.tier} · {node.risk.toUpperCase()}
                            </text>
                            <foreignObject x="8" y="30" width="154" height="82">
                              <div className="font-serif text-[12px] font-bold leading-tight text-[var(--color-ink)] mb-1">
                                {node.label}
                              </div>
                              <div className="font-mono text-[10px] leading-snug text-[var(--color-ink-secondary)]">
                                {node.detail}
                              </div>
                            </foreignObject>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB #33: EPIDEMIOLOGICAL & GLOBAL HEALTH TRACKER */}
          {!loading && !error && activeTab === 'epidemics' && (
            <div className="space-y-5">
              <div className="border-b border-[var(--color-paper-border)] pb-3">
                <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                  Feature #33 · WHO DON &amp; CDC Bulletins
                </span>
                <h3 className="text-2xl font-serif font-bold">
                  Epidemiological &amp; Global Health Outbreak Desk
                </h3>
                <p className="text-sm text-[var(--color-ink-secondary)]">
                  Aggregated Disease Outbreak News (DONs), regional pathogen vectors, and clinical containment alerts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bulletins.map((b) => (
                  <div
                    key={b.slug}
                    className="p-4 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border border-[var(--color-ink)] bg-[var(--color-paper)]">
                        {b.country} · {b.region}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 ${
                          b.alert_level === 'Emergency' || b.alert_level === 'High'
                            ? 'bg-[var(--color-accent)] text-white'
                            : 'border border-[var(--color-paper-border)] text-[var(--color-ink-secondary)]'
                        }`}
                      >
                        {b.alert_level}
                      </span>
                    </div>

                    <h4 className="font-serif text-lg font-bold">{b.pathogen}</h4>

                    <div className="flex items-center gap-4 font-mono text-xs text-[var(--color-ink-secondary)]">
                      <span>Confirmed Cases: <strong>{b.confirmed_cases.toLocaleString()}</strong></span>
                      <span>Trend: <strong className={b.trend === 'Accelerating' ? 'text-[var(--color-accent)]' : 'text-[var(--color-positive)]'}>{b.trend}</strong></span>
                    </div>

                    <p className="font-serif text-xs leading-relaxed text-[var(--color-ink-secondary)]">
                      {b.summary}
                    </p>
                    <div className="font-mono text-[10px] text-[var(--color-ink-muted)] pt-1 border-t border-[var(--color-paper-border)]">
                      Source: {b.source_agency}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB #34: INTERACTIVE ELECTORAL & PARLIAMENT SEAT SIMULATOR */}
          {!loading && !error && activeTab === 'elections' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-paper-border)] pb-3">
                <div>
                  <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                    Feature #34 · Coalition &amp; Seat Apportionment
                  </span>
                  <h3 className="text-2xl font-serif font-bold">
                    Interactive Parliament &amp; Coalition Simulator
                  </h3>
                  <p className="text-sm text-[var(--color-ink-secondary)]">
                    Compute live parliamentary chambers via D&apos;Hondt or Sainte-Laguë proportional apportionment.
                  </p>
                </div>

                {/* Preset Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => handleApplyPreset(p.slug)}
                      className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase border cursor-pointer ${
                        selectedPresetSlug === p.slug
                          ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]'
                          : 'bg-[var(--color-paper-alt)] text-[var(--color-ink-secondary)] border-[var(--color-paper-border)]'
                      }`}
                    >
                      {p.country}
                    </button>
                  ))}
                </div>
              </div>

              {simResult && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left: Semicircular Parliament Hemicycle SVG */}
                  <div className="lg:col-span-6 p-4 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] flex flex-col items-center space-y-4">
                    <div className="w-full flex items-center justify-between font-mono text-xs border-b border-[var(--color-paper-border)] pb-2">
                      <span>Chamber: <strong>{simResult.totalSeats} Seats</strong></span>
                      <span>Majority: <strong className="text-[var(--color-accent)]">{simResult.majorityRequired}</strong></span>
                      <span>Threshold: <strong>{simThresholdPct}%</strong></span>
                    </div>

                    <svg
                      viewBox="0 0 360 190"
                      className="w-full max-w-[360px] h-auto"
                      role="img"
                      aria-label="Parliament Hemicycle Diagram"
                    >
                      {hemicycleDots.map((dot, i) => (
                        <circle
                          key={i}
                          cx={dot.x}
                          cy={dot.y}
                          r={3.8}
                          fill={dot.color}
                        />
                      ))}
                      <text
                        x="180"
                        y="162"
                        textAnchor="middle"
                        className="fill-[var(--color-ink)] font-serif font-black text-[22px]"
                      >
                        {coalitionSeats}
                      </text>
                      <text
                        x="180"
                        y="178"
                        textAnchor="middle"
                        className="fill-[var(--color-ink-secondary)] font-mono text-[9px] uppercase font-bold"
                      >
                        Coalition ({coalitionSeats >= simResult.majorityRequired ? 'MAJORITY SECURED' : 'MINORITY'})
                      </text>
                    </svg>

                    {/* Method & Threshold Controls */}
                    <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-paper-border)]">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSimMethod('dhondt');
                            handleRunSimulation(simParties, 'dhondt', simThresholdPct);
                          }}
                          className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase border cursor-pointer ${
                            simMethod === 'dhondt'
                              ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]'
                              : 'bg-[var(--color-paper)] text-[var(--color-ink-secondary)] border-[var(--color-paper-border)]'
                          }`}
                        >
                          D&apos;Hondt
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSimMethod('sainte_lague');
                            handleRunSimulation(simParties, 'sainte_lague', simThresholdPct);
                          }}
                          className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase border cursor-pointer ${
                            simMethod === 'sainte_lague'
                              ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]'
                              : 'bg-[var(--color-paper)] text-[var(--color-ink-secondary)] border-[var(--color-paper-border)]'
                          }`}
                        >
                          Sainte-Laguë
                        </button>
                      </div>

                      <label className="flex items-center gap-2 font-mono text-[10px] uppercase">
                        <span>Threshold:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="15"
                          value={simThresholdPct}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setSimThresholdPct(val);
                            handleRunSimulation(simParties, simMethod, val);
                          }}
                          className="w-14 px-1.5 py-0.5 border border-[var(--color-paper-border)] bg-[var(--color-paper)] text-[var(--color-ink)] font-bold"
                        />
                        <span>%</span>
                      </label>
                    </div>
                  </div>

                  {/* Right: Party Vote Sliders & Coalition Toggle */}
                  <div className="lg:col-span-6 space-y-2.5">
                    <div className="font-mono text-[11px] uppercase font-bold text-[var(--color-ink-secondary)]">
                      Toggle Coalition Checkboxes &amp; Adjust Vote Shares:
                    </div>
                    {simResult.results.map((r: any, idx: number) => {
                      const inCoalition = coalitionIds.includes(r.id);
                      return (
                        <div
                          key={r.id}
                          className="p-2.5 bg-[var(--color-paper-alt)] border border-[var(--color-paper-border)] flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleCoalitionParty(r.id)}
                              className="flex items-center gap-2 text-left cursor-pointer"
                            >
                              {inCoalition ? (
                                <CheckSquare size={15} className="text-[var(--color-accent)] shrink-0" />
                              ) : (
                                <Square size={15} className="text-[var(--color-ink-muted)] shrink-0" />
                              )}
                              <span
                                className="w-3 h-3 rounded-xs shrink-0"
                                style={{ backgroundColor: r.color }}
                              />
                              <span className="font-serif font-bold text-sm">{r.name}</span>
                            </button>

                            <div className="font-mono text-xs tabular-nums flex items-center gap-2">
                              <span className="text-[var(--color-ink-secondary)]">{r.votePct.toFixed(1)}%</span>
                              <span
                                className={`px-2 py-0.5 font-bold ${
                                  r.qualified
                                    ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                                    : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)] line-through'
                                }`}
                              >
                                {r.seats} seats
                              </span>
                            </div>
                          </div>

                          <input
                            type="range"
                            min="0"
                            max="55"
                            step="0.5"
                            value={simParties[idx]?.votePct ?? r.votePct}
                            onChange={(e) => {
                              const nextVal = parseFloat(e.target.value);
                              const updated = simParties.map((p, pIdx) =>
                                pIdx === idx ? { ...p, votePct: nextVal } : p
                              );
                              setSimParties(updated);
                              handleRunSimulation(updated, simMethod, simThresholdPct);
                            }}
                            aria-label={`${r.name} vote percentage`}
                            className="w-full accent-[var(--color-accent)] cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB #35: VIP AIR TRAFFIC & DIPLOMATIC FLIGHT TRACKER */}
          {!loading && !error && activeTab === 'flights' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-paper-border)] pb-3">
                <div>
                  <span className="font-mono text-xs uppercase text-[var(--color-accent)] font-bold">
                    Feature #35 · OpenSky Diplomatic Transponders
                  </span>
                  <h3 className="text-2xl font-serif font-bold">
                    VIP Air Traffic &amp; Diplomatic Envoy Flight Radar
                  </h3>
                  <p className="text-sm text-[var(--color-ink-secondary)]">
                    Active statecraft flights, treaty observers, and humanitarian relief corridors tracked across hemispheres.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenGlobeLayer}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)] text-xs font-mono font-bold uppercase cursor-pointer shrink-0"
                >
                  <Plane size={13} />
                  <span>Plot Flight Vectors on Globe</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-[var(--color-paper-border)]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--color-paper-alt)] border-b border-[var(--color-ink)] font-mono uppercase text-[10px] tracking-wider">
                      <th className="p-3">Callsign / ICAO</th>
                      <th className="p-3">Operator &amp; Airframe</th>
                      <th className="p-3">Corridor (Origin → Dest)</th>
                      <th className="p-3">Mission</th>
                      <th className="p-3">Altitude / Speed</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-paper-border)]">
                    {flights.map((f) => (
                      <tr key={f.callsign} className="hover:bg-[var(--color-paper-alt)]/50">
                        <td className="p-3 font-mono">
                          <div className="font-bold text-[var(--color-accent)]">{f.callsign}</div>
                          <div className="text-[10px] text-[var(--color-ink-muted)]">{f.icao24}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-serif font-bold">{f.operator}</div>
                          <div className="font-mono text-[10px] text-[var(--color-ink-secondary)]">{f.aircraft_type}</div>
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {f.origin} → <strong>{f.destination}</strong>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase border border-[var(--color-paper-border)] bg-[var(--color-paper-alt)]">
                            {f.mission_type}
                          </span>
                        </td>
                        <td className="p-3 font-mono tabular-nums text-[11px]">
                          FL{Math.round(f.altitude_ft / 100)} · {f.speed_kts} kts
                        </td>
                        <td className="p-3 font-mono text-[11px] font-semibold text-[var(--color-positive)]">
                          {f.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Broadsheet Status Footer */}
        <footer className="px-4 py-2 border-t border-[var(--color-paper-border)] bg-[var(--color-paper-alt)] flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-[var(--color-ink-secondary)] shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-positive)]" />
            <span>WAR ROOM: ACTIVE TELEMETRY</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline">Esc: Close</span>
            <span>Shortcut: W</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default CartographyWarRoomDrawer;
