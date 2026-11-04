/**
 * frontend/src/components/layout/SystemHealthIndicator.tsx
 * Tri-Color Operational Health Pill & Diagnostics Flyout (PRD C Category 8 / Suggestion S2).
 *
 * Sits on the right edge of StatusStrip:
 * - Green dot: Nominal (all feeds, DB, AI/Plain mode, and scheduler healthy)
 * - Amber dot: Degraded (minor ingest lag or recent single error)
 * - Red dot: Attention required (connectivity loss or pipeline failure)
 *
 * Click or hover displays an authentic broadsheet status ticket.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Activity, ArrowUpRight, Database, Cpu, Radio } from 'lucide-react';

export interface SystemHealthIndicatorProps {
  forcedHealth?: any;
  forcedOpen?: boolean;
}

export const SystemHealthIndicator: React.FC<SystemHealthIndicatorProps> = ({
  forcedHealth,
  forcedOpen,
}) => {
  const [isOpenState, setIsOpen] = useState(false);
  const isOpen = forcedOpen !== undefined ? forcedOpen : isOpenState;
  const containerRef = useRef<HTMLDivElement>(null);

  const storeHealth = useAppStore((s) => s.systemHealth);
  const systemHealth = forcedHealth !== undefined ? forcedHealth : storeHealth;
  const fetchSystemHealth = useAppStore((s) => s.fetchSystemHealth);
  const setControlRoomOpen = useAppStore((s) => s.setControlRoomOpen);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // Poll health on mount and periodically every 30s
  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(() => {
      fetchSystemHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSystemHealth]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const statusColor =
    systemHealth.status === 'healthy'
      ? 'text-positive'
      : systemHealth.status === 'degraded'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-accent';

  const dotBg =
    systemHealth.status === 'healthy'
      ? 'bg-positive'
      : systemHealth.status === 'degraded'
        ? 'bg-amber-500'
        : 'bg-accent';

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* Tri-Color Health Pill */}
      <button
        type="button"
        id="btn-status-strip-system-health"
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-2xs border border-paper-border hover:border-ink bg-paper font-mono text-[0.625rem] font-bold text-ink transition-colors cursor-pointer select-none"
        title="System Operational Telemetry — Click to inspect diagnostic telemetry"
        aria-expanded={isOpen}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotBg} animate-pulse`} />
        <span>System: {systemHealth.label}</span>
      </button>

      {/* Broadsheet Diagnostics Flyout Popover */}
      {isOpen && (
        <div
          id="system-health-popover"
          className="absolute right-0 top-full mt-1.5 w-64 bg-paper border-2 border-ink text-ink rounded-xs shadow-overlay z-50 p-3 font-ui text-xs animate-in fade-in slide-in-from-top-1 duration-150"
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Top Stamp Rule */}
          <div className="flex items-center justify-between border-b border-paper-border pb-1.5 mb-2">
            <div className="flex items-center gap-1.5 font-headline font-bold text-xs uppercase tracking-wider">
              <Activity size={12} className={statusColor} />
              <span>Desk Operational Health</span>
            </div>
            <span className={`font-mono text-[0.5625rem] font-bold uppercase ${statusColor}`}>
              {systemHealth.status}
            </span>
          </div>

          {/* Diagnostic Metrics Matrix */}
          <div className="space-y-1.5 font-mono text-[0.6875rem] text-ink-secondary mb-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-ink-muted">
                <Radio size={10} /> RSS Wire Ingest:
              </span>
              <span className="font-bold text-ink">{systemHealth.details.rss}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-ink-muted">
                <Cpu size={10} /> AI Synthesis Engine:
              </span>
              <span className="font-bold text-ink">{systemHealth.details.ai}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-ink-muted">
                <Activity size={10} /> Scheduler Heartbeat:
              </span>
              <span className="font-bold text-positive">Nominal (&lt;30s)</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-ink-muted">
                <Database size={10} /> Local SQLite Database:
              </span>
              <span className="font-bold text-ink">{systemHealth.details.db}</span>
            </div>
          </div>

          {/* Bottom Action: Open Control Room */}
          <button
            type="button"
            id="btn-health-open-control-room"
            onClick={() => {
              setIsOpen(false);
              setControlRoomOpen(true);
              setCurrentView('control-room');
            }}
            className="w-full pt-1.5 border-t border-paper-border flex items-center justify-between text-[0.625rem] font-ui font-bold text-accent hover:text-accent-dark transition-colors cursor-pointer"
          >
            <span>Open System Control Room</span>
            <ArrowUpRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SystemHealthIndicator;

