/**
 * frontend/src/components/map/WorldMap.tsx
 * Interactive Global News Radar with Story Pins & Wildlife Crime Overlay (Phase 9).
 */
import React, { useState, useMemo, useEffect } from 'react';
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
import { Globe, X, ShieldAlert, Flame, Compass } from 'lucide-react';
import './WorldMap.css';

const GEO_URL = '/countries-110m.json';

interface TooltipData {
  x: number;
  y: number;
  stats: AggregatedCountryStats;
}

export const WorldMap: React.FC = () => {
  const isGlobeOpen = useAppStore((s) => s.isGlobeOpen);
  const setGlobeOpen = useAppStore((s) => s.setGlobeOpen);
  const articles = useAppStore((s) => s.articles);
  const setSelectedCountry = useAppStore((s) => s.setSelectedCountry);

  const [wildlifeOverlay, setWildlifeOverlay] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Keyboard navigation: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isGlobeOpen) {
        setGlobeOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobeOpen, setGlobeOpen]);

  // Aggregate country news
  const { countryStats, wildlifeCountries, totalDispatchesMapped } = useMemo(() => {
    return aggregateCountryNews(articles);
  }, [articles]);

  const statsList = useMemo(() => Object.values(countryStats), [countryStats]);

  const handleCountryClick = (countryKey: string) => {
    setSelectedCountry(countryKey);
    setGlobeOpen(false);
  };

  if (!isGlobeOpen) return null;

  return (
    <div
      className="world-map-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-map-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) setGlobeOpen(false);
      }}
    >
      <div className="world-map-modal">
        {/* Header */}
        <header className="world-map-header">
          <div className="world-map-header-left">
            <Globe className="world-map-header-icon" size={24} />
            <div>
              <h2 id="world-map-heading" className="world-map-title">
                Global News Radar &amp; Wildlife Intelligence
              </h2>
              <div className="world-map-subtitle">
                Live geographical dispatch density &bull; Environmental &amp; wildlife monitoring
              </div>
            </div>
          </div>

          <div className="world-map-header-controls">
            {/* Wildlife Crime Overlay Toggle (P9-04) */}
            <button
              id="btn-toggle-wildlife-overlay"
              className={`world-map-wildlife-toggle ${wildlifeOverlay ? 'active' : ''}`}
              onClick={() => setWildlifeOverlay((prev) => !prev)}
              title="Toggle Wildlife Crime & Species Dispatches Overlay"
            >
              <ShieldAlert size={14} />
              <span>Wildlife Layer: {wildlifeOverlay ? 'ACTIVE' : 'OFF'}</span>
            </button>

            {/* Close Button */}
            <button
              id="btn-close-globe-map"
              className="world-map-close-btn"
              onClick={() => setGlobeOpen(false)}
              aria-label="Close World Map"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Map Container */}
        <div
          className="world-map-container"
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
            projection="geoMercator"
            projectionConfig={{ scale: 125 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup center={[20, 25]} zoom={1} minZoom={0.8} maxZoom={4}>
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

                    // Fill color determination
                    let fillColor = '#111827';
                    let strokeColor = '#1e293b';

                    if (isWildlife) {
                      fillColor = 'rgba(239, 68, 68, 0.28)';
                      strokeColor = 'rgba(239, 68, 68, 0.6)';
                    } else if (stats && stats.articleCount > 0) {
                      fillColor = '#172238';
                      strokeColor = '#334155';
                    }

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        className="country-geography"
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={0.6}
                        onClick={() => {
                          if (countryKey) handleCountryClick(countryKey);
                        }}
                        onMouseEnter={(e) => {
                          if (stats) {
                            const bounds = e.currentTarget.closest('.world-map-container')?.getBoundingClientRect();
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

              {/* Story Pin Layer (P9-03) */}
              {statsList.map((st) => {
                const radius = Math.min(6 + Math.sqrt(st.articleCount) * 2.5, 18);
                const pinColor = CATEGORY_COLORS[st.topCategory] || '#6366f1';
                const isBreaking = st.highestBreakingScore >= 75 || st.breakingCount > 0;

                return (
                  <Marker
                    key={st.countryKey}
                    coordinates={st.centroid}
                    onClick={() => handleCountryClick(st.countryKey)}
                    onMouseEnter={(e) => {
                      const bounds = (e.target as SVGElement).closest('.world-map-container')?.getBoundingClientRect();
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
                    {/* Concentric pulsing radar wave for breaking news */}
                    {isBreaking && (
                      <circle
                        r={radius + 8}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={1.5}
                        className="map-pin-pulse"
                      />
                    )}

                    {/* Outer glow aura */}
                    <circle
                      r={radius + 2}
                      fill={pinColor}
                      opacity={0.35}
                    />

                    {/* Main Story Pin Dot */}
                    <circle
                      r={radius}
                      fill={pinColor}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />

                    {/* Article count label on marker */}
                    <text
                      textAnchor="middle"
                      y={3.5}
                      style={{
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '9px',
                        fontWeight: 800,
                        fill: '#ffffff',
                        pointerEvents: 'none',
                      }}
                    >
                      {st.articleCount}
                    </text>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>

          {/* Hover Tooltip (P9-05) */}
          {tooltip && (
            <div
              className="world-map-tooltip"
              style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
            >
              <div className="world-map-tooltip-header">
                <span className="world-map-tooltip-title">
                  {tooltip.stats.flag} {tooltip.stats.displayName}
                </span>
                <span className="world-map-tooltip-count">
                  {tooltip.stats.articleCount} {tooltip.stats.articleCount === 1 ? 'dispatch' : 'dispatches'}
                </span>
              </div>

              <div className="world-map-tooltip-meta">
                <span>Top:</span>
                <span style={{ color: CATEGORY_COLORS[tooltip.stats.topCategory] || '#f1f5f9', fontWeight: 600 }}>
                  {tooltip.stats.topCategory}
                </span>
              </div>

              {tooltip.stats.highestBreakingScore >= 75 && (
                <div className="world-map-tooltip-breaking">
                  <Flame size={12} color="#ef4444" />
                  <span>Breaking Story Active ({tooltip.stats.highestBreakingScore}%)</span>
                </div>
              )}

              {tooltip.stats.hasWildlifeCrime && (
                <div className="world-map-tooltip-wildlife">
                  <ShieldAlert size={12} color="#f97316" />
                  <span>Wildlife Dispatches ({tooltip.stats.wildlifeArticlesCount})</span>
                </div>
              )}

              <div className="world-map-tooltip-prompt">
                Click country to filter news desk feed
              </div>
            </div>
          )}
        </div>

        {/* Footer / Legend */}
        <footer className="world-map-footer">
          <div className="world-map-legend">
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Categories:</span>
            {['World', 'Politics', 'Business', 'Tech', 'Science', 'Animals', 'Environment'].map((cat) => (
              <div key={cat} className="world-map-legend-item">
                <span
                  className="world-map-legend-dot"
                  style={{ backgroundColor: CATEGORY_COLORS[cat] || '#6366f1' }}
                />
                <span>{cat}</span>
              </div>
            ))}
          </div>

          <div className="world-map-stats">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Compass size={14} color="var(--accent-primary)" />
              <span>{statsList.length} Active Hubs &bull; {totalDispatchesMapped} Mapped</span>
            </div>
            <span>Press ESC to return</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
