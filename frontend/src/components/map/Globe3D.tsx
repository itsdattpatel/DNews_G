/**
 * frontend/src/components/map/Globe3D.tsx
 * High-performance 3D Interactive Broadsheet Globe (PRD C Category 7 / Issue 3).
 *
 * Built with react-globe.gl & Three.js (pinned MIT).
 * Renders local vector GeoJSON from /countries-110m.json with zero external tile/satellite CDN dependencies.
 *
 * Broadsheet Features:
 * - Handcrafted Broadsheet styling: Night Edition (#0E0C09) and Paper Edition (#FAF7F0)
 * - Country news density pins with logarithmic scale and story count badges
 * - Wildlife Wire crimson markers (▲) for animal & conservation dispatches
 * - Pulsing arrival rings for breaking news (< 5m arrival or breaking score >= 75)
 * - Comparative coverage arcs connecting international news hubs
 * - Broadsheet deckle-edged popover tooltip on hover
 * - Smooth camera fly-to on country click (1200ms, altitude 1.8)
 * - Ambient auto-rotation (0.45 deg/s) with 8.0s idle resumption and prefers-reduced-motion guard
 * - WebGL context sentinel & FPS watchdog with automatic 2D fallback prompt
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { feature } from 'topojson-client';

// Ensure Three.js compatibility across globe.gl internals
if (typeof window !== 'undefined') {
  (window as any).THREE = THREE;
  if (THREE.Object3D && !(THREE.Object3D.prototype as any).intersectsFrustum) {
    (THREE.Object3D.prototype as any).intersectsFrustum = () => true;
  }
  if (THREE.Matrix4 && !(THREE.Matrix4.prototype as any).determinantAffine) {
    (THREE.Matrix4.prototype as any).determinantAffine = function() {
      const te = this.elements;
      const n11 = te[0], n12 = te[4], n13 = te[8];
      const n21 = te[1], n22 = te[5], n23 = te[9];
      const n31 = te[2], n32 = te[6], n33 = te[10];
      return (
        n11 * (n22 * n33 - n23 * n32) -
        n12 * (n21 * n33 - n23 * n31) +
        n13 * (n21 * n32 - n22 * n31)
      );
    };
  }
}
import type { Article } from '../../types';
import {
  aggregateCountryNews,
  resolveCountryKey,
  COUNTRY_COORDINATES,
  type AggregatedCountryStats,
} from '../../utils/geo';
import { Badge } from '../ui/badge';
import {
  RotateCw,
  ShieldAlert,
  Compass,
  ArrowRight,
  AlertTriangle,
  Radio,
  Layers,
} from 'lucide-react';

interface Globe3DProps {
  articles: Article[];
  isNight: boolean;
  wildlifeOverlay: boolean;
  autoRotate: boolean;
  onAutoRotateChange?: (autoRotate: boolean) => void;
  onCountrySelect: (countryKey: string) => void;
  onFallbackTo2D: () => void;
  onToggleWildlifeOverlay?: () => void;
  searchFilter?: string;
}

interface NewsArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  label: string;
}

interface ArrivalRing {
  lat: number;
  lng: number;
  countryKey: string;
}

export const Globe3D: React.FC<Globe3DProps> = ({
  articles,
  isNight,
  wildlifeOverlay,
  autoRotate,
  onAutoRotateChange,
  onCountrySelect,
  onFallbackTo2D,
  onToggleWildlifeOverlay,
  searchFilter = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [countriesGeoJson, setCountriesGeoJson] = useState<any>(null);
  const [isLoadingGeo, setIsLoadingGeo] = useState(true);
  const [hoveredPolygon, setHoveredPolygon] = useState<any>(null);
  const [hoveredStats, setHoveredStats] = useState<AggregatedCountryStats | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Performance watchdog
  const [fps, setFps] = useState<number>(60);
  const [isLowFps, setIsLowFps] = useState<boolean>(false);
  const lowFpsCounterRef = useRef<number>(0);

  // Auto-rotation idle resume timer
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // Reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // 1. Measure Container Dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const footerH = footerRef.current ? footerRef.current.offsetHeight : 48;
        setDimensions({
          width: Math.max(320, clientWidth),
          height: Math.max(200, clientHeight - footerH),
        });
      }
    };
    updateSize();

    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(containerRef.current);
    if (footerRef.current) {
      resizeObserver.observe(footerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  // 2. Load Local TopoJSON (No external CDN)
  useEffect(() => {
    let isMounted = true;
    fetch('/countries-110m.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load cartographic data (${res.status})`);
        return res.json();
      })
      .then((topo) => {
        if (!isMounted) return;
        const geojson = feature(topo, topo.objects.countries);
        setCountriesGeoJson(geojson);
        setIsLoadingGeo(false);
      })
      .catch((err) => {
        console.error('[Globe3D] Error parsing local cartography:', err);
        if (isMounted) {
          setIsLoadingGeo(false);
          onFallbackTo2D();
        }
      });

    return () => {
      isMounted = false;
    };
  }, [onFallbackTo2D]);

  // 3. Aggregate Country News
  const { countryStats, wildlifeCountries } = useMemo(() => {
    return aggregateCountryNews(articles);
  }, [articles]);

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

  // 4. Pin Markers for HTML Overlay Layer
  const pinMarkers = useMemo(() => {
    return statsList.map((st) => {
      const isWildlife = wildlifeCountries.has(st.countryKey);
      const isBreaking = st.highestBreakingScore >= 75 || st.breakingCount > 0;
      return {
        countryKey: st.countryKey,
        displayName: st.displayName,
        lat: st.centroid[1],
        lng: st.centroid[0],
        articleCount: st.articleCount,
        topCategory: st.topCategory,
        isWildlife,
        isBreaking,
        stats: st,
      };
    });
  }, [statsList, wildlifeCountries]);

  // 5. Arcs for International News Hubs
  const newsArcs = useMemo<NewsArc[]>(() => {
    const hubs = ['India', 'USA', 'China', 'Japan', 'United Kingdom', 'Australia'];
    const activeHubs = hubs.filter((h) => countryStats[h]?.articleCount > 0);
    const arcs: NewsArc[] = [];

    if (activeHubs.length >= 2) {
      for (let i = 0; i < activeHubs.length - 1; i++) {
        const fromKey = activeHubs[i];
        const toKey = activeHubs[i + 1];
        const fromCoord = COUNTRY_COORDINATES[fromKey];
        const toCoord = COUNTRY_COORDINATES[toKey];
        if (fromCoord && toCoord) {
          arcs.push({
            startLat: fromCoord.centroid[1],
            startLng: fromCoord.centroid[0],
            endLat: toCoord.centroid[1],
            endLng: toCoord.centroid[0],
            label: `${fromKey} ↔ ${toKey}`,
          });
        }
      }
    }
    return arcs;
  }, [countryStats]);

  // 6. Arrival Pulse Rings for Fresh / Breaking News
  const arrivalRings = useMemo<ArrivalRing[]>(() => {
    return statsList
      .filter((st) => st.breakingCount > 0 || st.highestBreakingScore >= 75)
      .map((st) => ({
        lat: st.centroid[1],
        lng: st.centroid[0],
        countryKey: st.countryKey,
      }));
  }, [statsList]);

  // 7. FPS Watchdog
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const measureFps = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / (now - lastTime));
        setFps(currentFps);

        if (currentFps < 30) {
          lowFpsCounterRef.current++;
          if (lowFpsCounterRef.current >= 3) {
            setIsLowFps(true);
          }
        } else {
          lowFpsCounterRef.current = 0;
        }

        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(measureFps);
    };

    animId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 8. Configure Three.js OrbitControls & Ambient Auto-Rotation with 8s Idle Resumption
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    try {
      const controls = globe.controls();
      if (controls) {
        controls.autoRotate = autoRotate && !prefersReducedMotion && !isUserInteracting;
        controls.autoRotateSpeed = 0.45; // 0.45 deg/sec polar ambient rotation
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Cap DPR at 2.0 to prevent GPU strain on 4K/retina displays
        const renderer = globe.renderer();
        if (renderer) {
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
        }

        const handleInteractionStart = () => {
          setIsUserInteracting(true);
          controls.autoRotate = false;
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };

        const handleInteractionEnd = () => {
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          idleTimerRef.current = setTimeout(() => {
            setIsUserInteracting(false);
            if (autoRotate && !prefersReducedMotion) {
              controls.autoRotate = true;
            }
          }, 8000); // Resume auto-rotation after 8.0s of inactivity
        };

        controls.addEventListener('start', handleInteractionStart);
        controls.addEventListener('end', handleInteractionEnd);

        return () => {
          controls.removeEventListener('start', handleInteractionStart);
          controls.removeEventListener('end', handleInteractionEnd);
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
      }
    } catch (e) {
      console.warn('[Globe3D] Controls init warning:', e);
    }
  }, [autoRotate, prefersReducedMotion, isUserInteracting]);

  // Globe Material matching Broadsheet Ink / Paper Oceans
  const globeMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: isNight ? '#14110B' : '#DDD5C7',
    });
  }, [isNight]);

  // Initial Camera Orientation
  const handleGlobeReady = useCallback(() => {
    if (globeRef.current) {
      if (typeof window !== 'undefined') (window as any).__globe = globeRef.current;
      globeRef.current.pointOfView({ lat: 20, lng: 25, altitude: 2.2 }, 0);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleGlobeReady();
    }, 150);
    return () => clearTimeout(timer);
  }, [handleGlobeReady]);

  // 9. Handcrafted Broadsheet Theme Colors
  const themeColors = useMemo(() => {
    if (isNight) {
      return {
        background: '#0E0C09', // Deep Ink backdrop
        polygonDefault: '#1C1811', // Inactive landmass
        polygonWithNews: '#2E261B', // Active news region
        polygonHover: '#3D3324', // Hovered wash
        polygonWildlife: 'rgba(231, 76, 60, 0.38)', // Crimson wash
        borderDefault: '#383023', // Subtle column rule
        borderWithNews: '#73634C', // Defined brass rule
        borderHover: '#E74C3C', // Crimson highlight
        borderWildlife: '#E74C3C',
        atmosphere: '#E74C3C', // Monochromatic breaking amber/crimson halo
        arc: 'rgba(231, 76, 60, 0.65)',
        ring: '#E74C3C',
      };
    } else {
      return {
        background: '#FAF7F0', // Parchment Paper backdrop
        polygonDefault: '#FAF7F0', // Paper White continent
        polygonWithNews: '#F0E7D8', // Inked news region
        polygonHover: '#E5DAC6', // Warm parchment wash
        polygonWildlife: 'rgba(192, 57, 43, 0.28)',
        borderDefault: '#A89984', // Classic engraved lithograph border
        borderWithNews: '#2E261B', // Strong ink border
        borderHover: '#C0392B', // Broadsheet crimson
        borderWildlife: '#C0392B',
        atmosphere: '#D9D0BE', // Warm ambient paper glow
        arc: 'rgba(192, 57, 43, 0.55)',
        ring: '#C0392B',
      };
    }
  }, [isNight]);

  // Country Click: Camera Fly-To & Filter Navigation
  const handleCountryClick = useCallback(
    (countryKey: string, lat?: number, lng?: number) => {
      const geo = COUNTRY_COORDINATES[countryKey];
      const targetLat = lat ?? geo?.centroid[1] ?? 20;
      const targetLng = lng ?? geo?.centroid[0] ?? 0;

      if (globeRef.current) {
        globeRef.current.pointOfView(
          { lat: targetLat, lng: targetLng, altitude: 1.8 },
          prefersReducedMotion ? 0 : 1200,
        );
      }

      onCountrySelect(countryKey);
    },
    [onCountrySelect, prefersReducedMotion],
  );

  // Polygon Click Handler
  const handlePolygonClick = useCallback(
    (polygon: any) => {
      const countryName = polygon.properties?.name || '';
      const countryKey = resolveCountryKey(countryName);
      if (countryKey) {
        handleCountryClick(countryKey);
      }
    },
    [handleCountryClick],
  );

  // Polygon Hover Handler
  const handlePolygonHover = useCallback(
    (polygon: any) => {
      setHoveredPolygon(polygon);
      if (polygon) {
        const countryName = polygon.properties?.name || '';
        const countryKey = resolveCountryKey(countryName);
        if (countryKey && countryStats[countryKey]) {
          setHoveredStats(countryStats[countryKey]);
        } else {
          setHoveredStats(null);
        }
      } else {
        setHoveredStats(null);
      }
    },
    [countryStats],
  );

  // Reset Camera View
  const handleResetCamera = useCallback(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView(
        { lat: 20, lng: 25, altitude: 2.3 },
        prefersReducedMotion ? 0 : 1000,
      );
    }
  }, [prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      id="globe-3d-container"
      className="w-full h-full relative select-none overflow-hidden flex flex-col"
      style={{ backgroundColor: themeColors.background }}
      onMouseMove={(e) => {
        if (hoveredStats) {
          const bounds = e.currentTarget.getBoundingClientRect();
          setTooltipPos({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
        }
      }}
      onDoubleClick={handleResetCamera}
    >
      {/* Loading Skeleton */}
      {isLoadingGeo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/90 z-20 gap-3">
          <RotateCw className="animate-spin text-accent" size={32} />
          <div className="font-headline text-lg font-bold text-ink">
            Engaging 3D Cartographic Radar...
          </div>
          <p className="font-ui text-xs text-ink-muted">
            Extracting vector boundaries from local broadsheet archives
          </p>
        </div>
      )}

      {/* Low FPS Performance Fallback Banner */}
      {isLowFps && (
        <div
          id="globe-low-fps-alert"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-paper-alt border-2 border-accent text-ink rounded-xs shadow-overlay flex items-center gap-3 text-xs font-ui animate-in fade-in"
        >
          <AlertTriangle size={16} className="text-accent shrink-0" />
          <span>Rendering performance below 30 FPS. Switch to 2D flat map for optimal smoothness?</span>
          <button
            type="button"
            onClick={onFallbackTo2D}
            className="px-2.5 py-1 bg-accent text-white font-bold rounded-xs hover:bg-accent-dark transition-colors"
          >
            Switch to 2D Map
          </button>
          <button
            type="button"
            onClick={() => setIsLowFps(false)}
            className="text-ink-muted hover:text-ink text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3D WebGL Globe Surface */}
      <div className="flex-1 w-full h-full relative">
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor={themeColors.background}
          showAtmosphere={true}
          atmosphereColor={themeColors.atmosphere}
          atmosphereAltitude={0.12}
          globeMaterial={globeMaterial}
          onGlobeReady={handleGlobeReady}
          // Country Polygons (Local GeoJSON features)
          polygonsData={countriesGeoJson ? countriesGeoJson.features : []}
            polygonGeoJsonGeometry={(d: any) => d.geometry}
            polygonCapColor={(d: any) => {
              const countryName = d.properties?.name || '';
              const countryKey = resolveCountryKey(countryName);
              const isHovered = hoveredPolygon === d;
              const isWildlife = wildlifeOverlay && countryKey && wildlifeCountries.has(countryKey);
              const hasNews = countryKey && countryStats[countryKey]?.articleCount > 0;

              if (isHovered) return themeColors.polygonHover;
              if (isWildlife) return themeColors.polygonWildlife;
              if (hasNews) return themeColors.polygonWithNews;
              return themeColors.polygonDefault;
            }}
            polygonSideColor={() =>
              isNight ? 'rgba(26, 23, 16, 0.8)' : 'rgba(217, 208, 190, 0.8)'
            }
            polygonStrokeColor={(d: any) => {
              const countryName = d.properties?.name || '';
              const countryKey = resolveCountryKey(countryName);
              const isHovered = hoveredPolygon === d;
              const isWildlife = wildlifeOverlay && countryKey && wildlifeCountries.has(countryKey);
              const hasNews = countryKey && countryStats[countryKey]?.articleCount > 0;

              if (isHovered) return themeColors.borderHover;
              if (isWildlife) return themeColors.borderWildlife;
              if (hasNews) return themeColors.borderWithNews;
              return themeColors.borderDefault;
            }}
            polygonAltitude={(d: any) => {
              if (hoveredPolygon === d) return 0.035;
              const countryName = d.properties?.name || '';
              const countryKey = resolveCountryKey(countryName);
              if (countryKey && countryStats[countryKey]?.articleCount > 0) return 0.012;
              return 0.005;
            }}
            polygonCapCurvatureResolution={2}
            onPolygonHover={handlePolygonHover}
            onPolygonClick={handlePolygonClick}
            // Points Data Layer (Logarithmic News Density Pins & Wildlife Markers)
            pointsData={pinMarkers}
            pointLat={(d: any) => d.lat}
            pointLng={(d: any) => d.lng}
            pointAltitude={0.02}
            pointRadius={(d: any) => {
              // Logarithmic scale per Section 5.1: 0.4 + 0.3 * ln(1 + N), scaled for visible cartography
              return Math.min(3.2, Math.max(1.3, 1.2 + 0.5 * Math.log(1 + d.articleCount)));
            }}
            pointColor={(d: any) => {
              if (wildlifeOverlay && d.isWildlife) return '#E74C3C';
              if (d.isBreaking) return themeColors.ring;
              return isNight ? '#E74C3C' : '#C0392B';
            }}
            onPointHover={(d: any) => {
              setHoveredStats(d ? d.stats : null);
            }}
            onPointClick={(d: any) => {
              handleCountryClick(d.countryKey, d.lat, d.lng);
            }}
            // Labels Data Layer (Broadsheet Typography & Story Counts)
            labelsData={pinMarkers}
            labelLat={(d: any) => d.lat}
            labelLng={(d: any) => d.lng}
            labelText={(d: any) =>
              `${wildlifeOverlay && d.isWildlife ? '▲ ' : ''}${d.displayName}: ${d.articleCount}`
            }
            labelSize={1.5}
            labelDotRadius={(d: any) => Math.min(2.0, 0.8 + 0.3 * Math.log(1 + d.articleCount))}
            labelDotOrientation="right"
            labelColor={(d: any) => {
              if (wildlifeOverlay && d.isWildlife) return '#E74C3C';
              if (d.isBreaking) return isNight ? '#E74C3C' : '#C0392B';
              return isNight ? '#FAF7F0' : '#14120E';
            }}
            labelAltitude={0.03}
            labelResolution={2}
            onLabelHover={(d: any) => {
              setHoveredStats(d ? d.stats : null);
            }}
            onLabelClick={(d: any) => {
              handleCountryClick(d.countryKey, d.lat, d.lng);
            }}
            // Arcs Data Layer (Comparative Coverage Connecting International Hubs)
            arcsData={newsArcs}
            arcStartLat={(d: any) => d.startLat}
            arcStartLng={(d: any) => d.startLng}
            arcEndLat={(d: any) => d.endLat}
            arcEndLng={(d: any) => d.endLng}
            arcColor={() => themeColors.arc}
            arcDashLength={0.35}
            arcDashGap={0.2}
            arcDashAnimateTime={2400}
            arcAltitude={0.18}
            // Arrival Rings Data Layer (Breaking News Pulsing Rings)
            ringsData={arrivalRings}
            ringLat={(d: any) => d.lat}
            ringLng={(d: any) => d.lng}
            ringColor={() => themeColors.ring}
            ringMaxRadius={7}
            ringPropagationSpeed={2.5}
            ringRepeatPeriod={1600}
            ringAltitude={0.015}
          />
      </div>

      {/* Broadsheet Deckle-Edged Popover Tooltip */}
      {hoveredStats && tooltipPos && (
        <div
          id="globe-broadsheet-tooltip"
          className="absolute pointer-events-none z-30 p-4 bg-paper text-ink border-2 border-ink rounded-xs shadow-overlay max-w-sm w-72 transition-all -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: `${Math.min(dimensions.width - 160, Math.max(160, tooltipPos.x))}px`,
            top: `${Math.max(12, tooltipPos.y - 12)}px`,
          }}
        >
          {/* Top Broadsheet Rule */}
          <div className="h-[2px] bg-ink w-full mb-2" />

          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 font-headline text-lg font-bold">
              <span>{hoveredStats.flag}</span>
              <span>{hoveredStats.displayName}</span>
            </div>
            <Badge
              category={hoveredStats.topCategory}
              className="text-[0.5625rem] px-1.5 py-0.2"
            />
          </div>

          <div className="flex items-center gap-3 font-mono text-[0.6875rem] text-ink-secondary mb-2.5 pb-2 border-b border-paper-border">
            <span>
              <strong>{hoveredStats.articleCount}</strong> Dispatches
            </span>
            {hoveredStats.breakingCount > 0 && (
              <span className="text-accent font-bold">
                {hoveredStats.breakingCount} Breaking
              </span>
            )}
            {hoveredStats.hasWildlifeCrime && (
              <span className="text-accent font-bold flex items-center gap-0.5">
                ▲ Wildlife Wire
              </span>
            )}
          </div>

          {/* Top Headline in Region */}
          {hoveredStats.topHeadline && (
            <div className="mb-2">
              <div className="font-ui text-[0.625rem] uppercase font-bold text-ink-muted mb-0.5">
                Lead Wire Dispatch:
              </div>
              <h4 className="font-headline text-xs font-bold leading-snug line-clamp-2">
                {hoveredStats.topHeadline}
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

      {/* Broadsheet 3D Globe Bottom Radar Toolbar */}
      <footer
        ref={footerRef}
        className="p-3 bg-paper-alt border-t-2 border-ink flex flex-wrap items-center justify-between gap-3 text-xs font-ui shrink-0 z-10"
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto-Rotation Toggle */}
          <button
            type="button"
            id="btn-globe-autorotate"
            onClick={() => onAutoRotateChange && onAutoRotateChange(!autoRotate)}
            title="Toggle Ambient Auto-Rotation (halts on drag, resumes after 8s idle)"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs border text-xs font-semibold transition-colors ${
              autoRotate && !prefersReducedMotion
                ? 'border-accent bg-accent text-white'
                : 'border-paper-border bg-paper text-ink hover:border-ink'
            }`}
          >
            <RotateCw size={12} className={autoRotate && !prefersReducedMotion ? 'animate-spin' : ''} />
            <span>Auto-Rotate: {autoRotate && !prefersReducedMotion ? 'ON' : 'OFF'}</span>
          </button>

          {/* Wildlife Layer Toggle */}
          <button
            type="button"
            id="btn-globe-wildlife"
            onClick={onToggleWildlifeOverlay}
            title="Toggle Wildlife Crime & Nature Dispatches"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs border text-xs font-semibold transition-colors ${
              wildlifeOverlay
                ? 'border-accent bg-accent text-white'
                : 'border-paper-border bg-paper text-ink hover:border-ink'
            }`}
          >
            <ShieldAlert size={12} />
            <span>Wildlife Wire: {wildlifeOverlay ? 'ON' : 'OFF'}</span>
          </button>

          {/* Reset Camera View */}
          <button
            type="button"
            id="btn-globe-reset"
            onClick={handleResetCamera}
            title="Reset Camera Orientation"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs border border-paper-border bg-paper text-ink hover:border-ink transition-colors"
          >
            <Compass size={12} />
            <span>Reset View</span>
          </button>

          {/* Switch to 2D Map Button */}
          <button
            type="button"
            id="btn-switch-to-flat-map"
            onClick={onFallbackTo2D}
            title="Switch to Lightweight 2D Flat Map"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs border border-paper-border bg-paper text-ink hover:border-ink transition-colors"
          >
            <Layers size={12} />
            <span>Flat 2D Map</span>
          </button>
        </div>

        {/* Status & FPS Meter */}
        <div className="flex items-center gap-3 font-mono text-[0.6875rem] text-ink-secondary">
          <span className="flex items-center gap-1">
            <Radio size={11} className={fps >= 30 ? 'text-positive' : 'text-accent'} />
            <strong>{fps} FPS</strong>
          </span>
          <span className="hidden sm:inline">WebGL 2.0 Vector Cartography</span>
          <span className="text-ink-muted">·</span>
          <span className="hidden md:inline">Double-click: Reset · Drag: Rotate · Click: Filter</span>
        </div>
      </footer>
    </div>
  );
};

export default Globe3D;
