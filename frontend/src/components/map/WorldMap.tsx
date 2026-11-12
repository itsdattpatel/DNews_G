/**
 * frontend/src/components/map/WorldMap.tsx
 * Screen (e): Global News Radar & Wildlife Crime Cartography (PRD C Category 7 / Issue 3).
 *
 * Broadsheet Cartographic Projection Hub:
 * - High-fidelity 3D Interactive Globe (react-globe.gl + Three.js vector polygons)
 * - 2D Broadsheet Flat Map projections (Mercator & Equal Earth via react-simple-maps)
 * - Pulsing breaking news pins, wildlife crime triangle markers (▲)
 * - Full Broadsheet design system integration (Paper & Night editions)
 * - Instant manual & automatic WebGL fallback between 3D Globe and 2D Flat Map
 */
import React, { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { useAppStore } from '../../store/useAppStore';
import {
  aggregateCountryNews,
  CATEGORY_COLORS,
  resolveCountryKey,
  type AggregatedCountryStats,
} from '../../utils/geo';
import { Badge } from '../ui/badge';
import {
  X,
  ShieldAlert,
  Globe2,
  Compass,
  ArrowRight,
  Search,
  RotateCw,
} from 'lucide-react';

// Lazy-load 3D Globe so Three.js and react-globe.gl are isolated from main bundle
const Globe3D = lazy(() => import('./Globe3D'));

const GEO_URL = '/countries-110m.json';

interface TooltipData {
  x: number;
  y: number;
  stats: AggregatedCountryStats;
}

type ProjectionType = 'globe3d' | 'geoMercator' | 'geoEqualEarth';

interface WorldMapProps {
  forceOpen?: boolean;
}

function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

const DEFAULT_MAP_CENTER: [number, number] = [20, 25];

export const WorldMap: React.FC<WorldMapProps> = ({ forceOpen }) => {
  const isGlobeOpenStore = useAppStore((s) => s.isGlobeOpen);
  const isGlobeOpen = forceOpen ?? isGlobeOpenStore;
  const setGlobeOpen = useAppStore((s) => s.setGlobeOpen);
  const articles = useAppStore((s) => s.articles);
  const pendingNewArticles = useAppStore((s) => s.pendingNewArticles);
  const setSelectedCountry = useAppStore((s) => s.setSelectedCountry);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const theme = useAppStore((s) => s.theme);
  const settings = useAppStore((s) => s.settings);

  const [mapViewport, setMapViewport] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: DEFAULT_MAP_CENTER,
    zoom: 1,
  });

  // Check WebGL availability once
  const webGLAvailable = useMemo(() => checkWebGLSupport(), []);

  // Default projection: 3D Globe if WebGL available and settings allow, otherwise Mercator
  const [projection, setProjection] = useState<ProjectionType>(() => {
    if (webGLAvailable && settings.map_engine !== 'flat') {
      return 'globe3d';
    }
    return 'geoMercator';
  });

  const [wildlifeOverlay, setWildlifeOverlay] = useState(
    settings.map_wildlife_layer !== false,
  );
  const [autoRotate, setAutoRotate] = useState(
    settings.globe_autorotate !== false,
  );
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isGlobeOpen) {
        setGlobeOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobeOpen, setGlobeOpen]);

  // Combine active snapshot + pending live arrivals for live cartography counts without shifting the reader queue
  const mapArticles = useMemo(() => {
    if (!pendingNewArticles.length) return articles;
    const seen = new Set(articles.map((a) => a.id));
    return [...pendingNewArticles.filter((a) => !seen.has(a.id)), ...articles];
  }, [articles, pendingNewArticles]);

  // Aggregate country news
  const { countryStats, wildlifeCountries, totalDispatchesMapped } = useMemo(() => {
    return aggregateCountryNews(mapArticles);
  }, [mapArticles]);

  const statsList = useMemo(() => {
    const list = Object.values(countryStats);
    if (!searchFilter.trim()) return list;
    const q = searchFilter.trim().toLowerCase();
    return list.filter(
      (st) =>
        st.countryKey.toLowerCase().includes(q) ||
        st.displayName.toLowerCase().includes(q),
    );
  }, [countryStats, searchFilter]);

  const handleCountryClick = useCallback(
    (countryKey: string) => {
      setSelectedCountry(countryKey);
      setGlobeOpen(false);
      setCurrentView('category');
    },
    [setSelectedCountry, setGlobeOpen, setCurrentView],
  );

  const handleCycleProjection = () => {
    if (projection === 'globe3d') {
      setProjection('geoMercator');
    } else if (projection === 'geoMercator') {
      setProjection('geoEqualEarth');
    } else {
      setProjection(webGLAvailable ? 'globe3d' : 'geoMercator');
    }
  };

  const handleFallbackTo2D = useCallback(() => setProjection('geoMercator'), []);
  const handleToggleWildlifeOverlay = useCallback(() => setWildlifeOverlay((prev) => !prev), []);

  if (!isGlobeOpen) return null;

  const isNight = theme === 'night';

  return (
    <div
      id="world-map-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-map-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-ink/75 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) setGlobeOpen(false);
      }}
    >
      <div
        className="w-full max-w-6xl h-[88vh] bg-paper text-ink border-2 border-ink rounded-xs shadow-overlay flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Broadsheet Masthead Header */}
        <header className="p-4 sm:p-5 border-b-2 border-ink bg-paper-alt flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-ui text-[0.6875rem] font-bold uppercase tracking-widest text-ink-secondary">
                Cartographic News Radar · Global Wire Dispatches
              </span>
              <span className="text-ink-muted text-xs">/</span>
              <span className="font-mono text-xs font-bold text-accent">
                {totalDispatchesMapped} Geotagged Reports
              </span>
            </div>

            <h2
              id="world-map-heading"
              className="font-headline text-2xl sm:text-3xl font-bold tracking-tight text-ink"
            >
              Global Cartographic News Radar
            </h2>

            <div className="font-ui text-xs text-ink-secondary flex items-center gap-2">
              <span>
                Live dispatch density across international borders · Wildlife conservation crime tracking
              </span>
            </div>
          </div>

          {/* Header Controls: Wildlife Toggle + Projection + Search + Close */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Wildlife Crime Overlay Toggle */}
            <button
              id="btn-toggle-wildlife-overlay"
              type="button"
              onClick={() => setWildlifeOverlay((prev) => !prev)}
              title="Toggle Wildlife Crime & Species Dispatches Overlay"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border text-xs font-bold transition-all shadow-xs ${
                wildlifeOverlay
                  ? 'border-accent bg-accent text-white font-extrabold'
                  : 'border-paper-border bg-paper hover:border-accent text-ink-secondary hover:text-accent'
              }`}
            >
              <ShieldAlert size={13} />
              <span>Wildlife Layer: {wildlifeOverlay ? 'ACTIVE' : 'OFF'}</span>
            </button>

            {/* Projection Selector Toggle */}
            <button
              type="button"
              id="btn-toggle-projection"
              onClick={handleCycleProjection}
              title="Toggle Cartographic Map Projection (3D Globe / Mercator / Equal Earth)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-paper-border hover:border-ink bg-paper rounded-xs font-mono text-xs font-semibold text-ink transition-colors"
            >
              <Compass size={12} />
              <span>
                {projection === 'globe3d'
                  ? '3D Globe'
                  : projection === 'geoMercator'
                    ? 'Mercator (2D)'
                    : 'Equal Earth (2D)'}
              </span>
            </button>

            {/* Search Country Filter */}
            <div className="relative hidden sm:block">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                type="text"
                placeholder="Find country..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-32 pl-7 pr-2 py-1 bg-paper border border-paper-border focus:border-ink rounded-xs font-ui text-xs text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </div>

            {/* Close Button */}
            <button
              id="btn-close-globe-map"
              type="button"
              onClick={() => setGlobeOpen(false)}
              className="p-1.5 border border-paper-border hover:border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs transition-colors shrink-0"
              title="Close Global Radar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 2. Map Canvas (3D Globe or 2D Flat Map) */}
        {projection === 'globe3d' ? (
          <div id="globe-3d-wrapper" className="flex-1 w-full min-h-0 relative overflow-hidden bg-paper flex flex-col">
            <Suspense
              fallback={
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/90 z-20 gap-3">
                  <RotateCw className="animate-spin text-accent" size={32} />
                  <div className="font-headline text-lg font-bold text-ink">
                    Engaging 3D Cartographic Radar...
                  </div>
                </div>
              }
            >
              <Globe3D
                articles={mapArticles}
                isNight={isNight}
                wildlifeOverlay={wildlifeOverlay}
                autoRotate={autoRotate}
                onAutoRotateChange={setAutoRotate}
                onCountrySelect={handleCountryClick}
                onFallbackTo2D={handleFallbackTo2D}
                onToggleWildlifeOverlay={handleToggleWildlifeOverlay}
                searchFilter={searchFilter}
              />
            </Suspense>
          </div>
        ) : (
          <div
            id="world-map-surface"
            className="flex-1 w-full min-h-0 relative overflow-hidden bg-paper"
            onMouseMove={(e) => {
              if (tooltip) {
                const bounds = e.currentTarget.getBoundingClientRect();
                setTooltip((prev) =>
                  prev ? { ...prev, x: e.clientX - bounds.left, y: e.clientY - bounds.top } : null,
                );
              }
            }}
          >
            <ComposableMap
              projection={projection}
              projectionConfig={{ scale: projection === 'geoMercator' ? 125 : 155 }}
              style={{ width: '100%', height: '100%' }}
            >
              <ZoomableGroup
                center={mapViewport.coordinates}
                zoom={mapViewport.zoom}
                minZoom={0.8}
                maxZoom={4}
                onMoveEnd={(position) =>
                  setMapViewport((prev) => ({
                    coordinates: position.coordinates ?? prev.coordinates,
                    zoom: position.zoom ?? prev.zoom,
                  }))
                }
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const geoName = geo.properties?.name || '';
                      const geoId = String(geo.id || '');
                      const countryKey = resolveCountryKey(geoName);

                      const isWildlife =
                        wildlifeOverlay &&
                        (wildlifeCountries.has(countryKey || '') ||
                          wildlifeCountries.has(geoName) ||
                          wildlifeCountries.has(geoId));

                      const stats = countryKey ? countryStats[countryKey] : null;

                      // Authentic Broadsheet Cartography Fills
                      let fillColor = isNight ? '#1A1710' : '#F4EFE6';
                      let strokeColor = isNight ? '#2E2A22' : '#D1C7B7';

                      if (isWildlife) {
                        fillColor = isNight ? 'rgba(231, 76, 60, 0.28)' : 'rgba(192, 57, 43, 0.22)';
                        strokeColor = isNight ? '#E74C3C' : '#C0392B';
                      } else if (stats && stats.articleCount > 0) {
                        fillColor = isNight ? '#242017' : '#E8E1D1';
                        strokeColor = isNight ? '#4A4235' : '#14120E';
                      }

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={0.7}
                          onClick={() => {
                            if (countryKey) handleCountryClick(countryKey);
                          }}
                          onMouseEnter={(e) => {
                            if (stats) {
                              const bounds = e.currentTarget
                                .closest('#world-map-surface')
                                ?.getBoundingClientRect();
                              if (bounds) {
                                setTooltip({
                                  x: e.clientX - bounds.left,
                                  y: e.clientY - bounds.top,
                                  stats,
                                });
                              }
                            }
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          style={{
                            outline: 'none',
                            cursor: countryKey ? 'pointer' : 'default',
                          }}
                        />
                      );
                    })
                  }
                </Geographies>

                {/* 3. Story Pins & Wildlife Crime Markers */}
                {statsList.map((st) => {
                  const isWildlife = wildlifeCountries.has(st.countryKey);
                  const isBreaking = st.highestBreakingScore >= 75 || st.breakingCount > 0;
                  const radius = Math.min(6 + Math.sqrt(st.articleCount) * 2.5, 16);
                  const pinColor = CATEGORY_COLORS[st.topCategory] || (isNight ? '#E8E4DA' : '#14120E');

                  return (
                    <Marker
                      key={st.countryKey}
                      coordinates={st.centroid}
                      onClick={() => handleCountryClick(st.countryKey)}
                      onMouseEnter={(e) => {
                        const bounds = (e.target as SVGElement)
                          .closest('#world-map-surface')
                          ?.getBoundingClientRect();
                        if (bounds) {
                          setTooltip({
                            x: e.clientX - bounds.left,
                            y: e.clientY - bounds.top,
                            stats: st,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Concentric Pulsing Radar Ring for Breaking News */}
                      {isBreaking && (
                        <circle
                          r={radius + 8}
                          fill="none"
                          stroke={isNight ? '#E74C3C' : '#C0392B'}
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          className="animate-ping"
                          style={{ transformOrigin: 'center' }}
                        />
                      )}

                      {/* Circular Story Pin */}
                      <circle
                        r={radius}
                        fill={pinColor}
                        stroke={isNight ? '#FAF7F0' : '#14120E'}
                        strokeWidth={1.5}
                        className="shadow-sm transition-transform hover:scale-125"
                      />

                      {/* Pin Article Count Number */}
                      <text
                        textAnchor="middle"
                        y={3.5}
                        className="font-mono text-[0.625rem] font-bold tabular-nums fill-white select-none pointer-events-none"
                      >
                        {st.articleCount}
                      </text>

                      {/* Distinct Wildlife Crime Triangle Marker (▲) */}
                      {wildlifeOverlay && isWildlife && (
                        <polygon
                          points="-7,-18 7,-18 0,-7"
                          fill={isNight ? '#E74C3C' : '#C0392B'}
                          stroke={isNight ? '#14120E' : '#FAF7F0'}
                          strokeWidth={1}
                          className="transition-transform hover:scale-125"
                        />
                      )}
                    </Marker>
                  );
                })}
              </ZoomableGroup>
            </ComposableMap>

            {/* 4. Interactive Broadsheet Clipping Tooltip */}
            {tooltip && (
              <div
                id="world-map-tooltip"
                className="absolute pointer-events-none z-30 p-4 bg-paper text-ink border-2 border-ink rounded-xs shadow-overlay max-w-sm w-72 transition-all -translate-x-1/2 -translate-y-full mb-3"
                style={{
                  left: `${Math.min(window.innerWidth - 320, Math.max(160, tooltip.x))}px`,
                  top: `${tooltip.y - 12}px`,
                }}
              >
                {/* Top Rule */}
                <div className="h-[2px] bg-ink w-full mb-2" />

                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 font-headline text-lg font-bold">
                    <span>{tooltip.stats.flag}</span>
                    <span>{tooltip.stats.displayName}</span>
                  </div>
                  <Badge
                    category={tooltip.stats.topCategory}
                    className="text-[0.5625rem] px-1.5 py-0.2"
                  />
                </div>

                <div className="flex items-center gap-3 font-mono text-[0.6875rem] text-ink-secondary mb-2.5 pb-2 border-b border-paper-border">
                  <span>
                    <strong>{tooltip.stats.articleCount}</strong> Dispatches
                  </span>
                  {tooltip.stats.breakingCount > 0 && (
                    <span className="text-accent font-bold">
                      {tooltip.stats.breakingCount} Breaking
                    </span>
                  )}
                </div>

                {/* Top Headline in Region */}
                {tooltip.stats.topHeadline && (
                  <div className="mb-2">
                    <div className="font-ui text-[0.625rem] uppercase font-bold text-ink-muted mb-0.5">
                      Lead Wire Dispatch:
                    </div>
                    <h4 className="font-headline text-xs font-bold leading-snug line-clamp-2">
                      {tooltip.stats.topHeadline}
                    </h4>
                  </div>
                )}

                {/* Action Hint */}
                <div className="pt-2 border-t border-paper-border flex items-center justify-between text-[0.625rem] font-ui font-bold text-accent">
                  <span>Click region to filter wire</span>
                  <ArrowRight size={10} />
                </div>
              </div>
            )}

            {/* Empty Pins Warning */}
            {statsList.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-paper/80 backdrop-blur-xs">
                <Globe2 size={36} className="text-ink-muted mb-3" />
                <h3 className="font-headline text-xl font-bold mb-1">No Geotagged Articles</h3>
                <p className="font-body text-xs text-ink-secondary max-w-xs">
                  No location metadata detected in active dispatches for the current search filter.
                </p>
              </div>
            )}

            {/* 2D Flat Map Footer Switcher to 3D */}
            {webGLAvailable && (
              <footer className="absolute bottom-3 left-3 z-20">
                <button
                  type="button"
                  id="btn-switch-to-3d-globe"
                  onClick={() => setProjection('globe3d')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-paper text-ink border border-paper-border hover:border-ink rounded-xs text-xs font-ui font-bold shadow-xs transition-colors"
                >
                  <Globe2 size={13} className="text-accent" />
                  <span>Switch to 3D Globe</span>
                </button>
              </footer>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldMap;
