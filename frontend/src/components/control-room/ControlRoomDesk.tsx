/**
 * frontend/src/components/control-room/ControlRoomDesk.tsx
 * Broadsheet Desk Control Room & Telemetry Wire (PRD A Category 11).
 * Displays live source freshness, scheduler metrics, AI quotas & fallback status,
 * queue throughput, SQLite storage limits, system operating modes, and a filterable error ledger.
 */
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { sseBus } from '../../lib/sseBus';
import { useWindowedList } from '../../hooks/useWindowedList';
import { MAX_IN_MEMORY_ERRORS, capList } from '../../utils/liveDesk';
import type {
  ControlRoomTelemetry,
  SystemErrorRecord,
} from '../../types';
import {
  Activity,
  Server,
  Database,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  X,
  Search,
  Trash2,
  Play,
  HardDrive,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';

type ActiveTab = 'overview' | 'sources' | 'scheduler-queues' | 'ai-quotas' | 'errors' | 'storage-modes';

export interface ControlRoomDeskProps {
  forceOpen?: boolean;
  initialTelemetry?: ControlRoomTelemetry;
  initialTab?: ActiveTab;
}

export const ControlRoomDesk: React.FC<ControlRoomDeskProps> = ({
  forceOpen,
  initialTelemetry,
  initialTab = 'overview',
}) => {
  const storeControlRoomOpen = useAppStore((s) => s.isControlRoomOpen);
  const isControlRoomOpen = forceOpen ?? storeControlRoomOpen;
  const setControlRoomOpen = useAppStore((s) => s.setControlRoomOpen);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [telemetry, setTelemetry] = useState<ControlRoomTelemetry | null>(initialTelemetry ?? null);
  const [isLoading, setIsLoading] = useState(!initialTelemetry);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);

  // Error Ledger Filter State
  const [errors, setErrors] = useState<SystemErrorRecord[]>([]);
  const [errorsTotal, setErrorsTotal] = useState(0);
  const [selectedSubsystem, setSelectedSubsystem] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isErrorsLoading, setIsErrorsLoading] = useState(false);
  const [isTriggeringCycle, setIsTriggeringCycle] = useState(false);
  const [expandedErrorId, setExpandedErrorId] = useState<number | null>(null);
  const sseStatus = useAppStore((s) => s.sseStatus);
  const errorsContainerRef = useRef<HTMLDivElement | null>(null);

  const { endIndex: errorsEndIndex, showMore: showMoreErrors, hasMore: hasMoreErrors } = useWindowedList({
    totalCount: errors.length,
    estimateItemHeight: 48,
    minRenderCount: 40,
    containerRef: errorsContainerRef,
  });
  const visibleErrors = useMemo(() => errors.slice(0, errorsEndIndex), [errors, errorsEndIndex]);

  // Source Freshness filter
  const [sourceFilterTier, setSourceFilterTier] = useState<string>('all');

  const fetchTelemetry = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setIsLoading(true);
      setError(null);
      const res = await apiFetch('/api/control-room/telemetry');
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load telemetry`);
      const data = (await res.json()) as ControlRoomTelemetry;
      setTelemetry(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!opts?.silent) setError(msg);
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  }, []);

  const fetchErrors = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setIsErrorsLoading(true);
      const params = new URLSearchParams();
      if (selectedSubsystem !== 'all') params.set('subsystem', selectedSubsystem);
      if (selectedLevel !== 'all') params.set('level', selectedLevel);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      params.set('limit', String(MAX_IN_MEMORY_ERRORS));

      const res = await apiFetch(`/api/control-room/errors?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load errors`);
      const data = await res.json();
      setErrors(capList(data.items ?? [], MAX_IN_MEMORY_ERRORS));
      setErrorsTotal(data.total ?? 0);
    } catch (err) {
      console.warn('[ControlRoom] Fetch errors failed:', err);
    } finally {
      if (!opts?.silent) setIsErrorsLoading(false);
    }
  }, [selectedSubsystem, selectedLevel, searchQuery]);

  // Initial fetch + live SSE push subscription when desk is open (fallback poll only if disconnected)
  useEffect(() => {
    if (!isControlRoomOpen) return;

    fetchTelemetry();
    fetchErrors();

    const unsub = sseBus.subscribeMany(
      ['control_room_update', 'system_error', 'quota_update', 'provider_switch', 'connected', 'resync'],
      (event) => {
        if (!useAppStore.getState().isControlRoomOpen) return;
        fetchTelemetry({ silent: true });
        if (event === 'system_error' || event === 'control_room_update' || event === 'resync') {
          fetchErrors({ silent: true });
        }
      },
    );

    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    if (sseStatus !== 'connected') {
      fallbackTimer = setInterval(() => {
        fetchTelemetry({ silent: true });
        fetchErrors({ silent: true });
      }, 30_000);
    }

    return () => {
      unsub();
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [isControlRoomOpen, sseStatus, fetchTelemetry, fetchErrors]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isControlRoomOpen) {
        setControlRoomOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isControlRoomOpen, setControlRoomOpen]);

  const handleTriggerCycle = async () => {
    try {
      setIsTriggeringCycle(true);
      toast.info('Initiating scheduled ingestion cycle across 24 feeds...');
      const res = await apiFetch('/api/control-room/trigger-fetch', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'already_running') {
        toast.warning('A fetch cycle is currently already in progress.');
      } else {
        toast.success(`Cycle complete: ${data.fetched} articles fetched (${data.newCount} new dispatches).`);
      }
      fetchTelemetry();
      fetchErrors();
    } catch (err) {
      toast.error('Failed to trigger manual fetch cycle.');
    } finally {
      setIsTriggeringCycle(false);
    }
  };

  const handleClearErrors = async () => {
    if (!window.confirm('Clear all logged records from the system error ledger?')) return;
    try {
      const res = await apiFetch('/api/control-room/errors/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      toast.success(`Cleared ${data.count} error entries from ledger.`);
      fetchErrors();
      fetchTelemetry();
    } catch (err) {
      toast.error('Failed to clear error ledger.');
    }
  };

  if (!isControlRoomOpen) return null;

  const filteredSources = telemetry?.sources.filter((s) => {
    if (sourceFilterTier === 'all') return true;
    return s.freshness_tier === sourceFilterTier;
  }) ?? [];

  return (
    <AnimatePresence>
      <div
        id="control-room-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-xs p-3 md:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) setControlRoomOpen(false);
        }}
      >
        <motion.div
          id="control-room-desk"
          role="dialog"
          aria-modal="true"
          aria-labelledby="control-room-title"
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          data-lenis-prevent="true"
          className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-paper border-2 border-ink rounded-xs shadow-overlay text-ink overflow-hidden"
        >
          {/* 1. Broadsheet Masthead Header */}
          <div className="border-b-2 border-ink p-4 sm:p-5 bg-paper-alt flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <Activity size={20} className="text-accent" />
                <h2 id="control-room-title" className="font-masthead text-2xl sm:text-3xl tracking-tight text-ink">
                  Desk Control Room & Telemetry Wire
                </h2>
                <span className="font-mono text-[0.625rem] px-2 py-0.5 border border-ink/40 bg-paper font-bold uppercase rounded-xs">
                  OPS-HUB
                </span>
              </div>
              <p className="font-ui text-xs text-ink-secondary mt-0.5">
                Central Operations · Feed Freshness Matrix · Scheduler Telemetry · Quota Economics · Error Ledger
              </p>
            </div>

            {/* Top Operational Action Bar */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Trigger Fetch Button */}
              <button
                id="btn-control-room-trigger-fetch"
                onClick={handleTriggerCycle}
                disabled={isTriggeringCycle || (telemetry?.scheduler.is_running ?? false)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-ink bg-paper hover:bg-paper-alt text-xs font-semibold rounded-xs shadow-xs disabled:opacity-50 transition-colors"
                title="Trigger immediate feed fetch cycle across all 24 sources"
              >
                <Play size={13} className={isTriggeringCycle ? 'animate-spin text-accent' : 'text-accent fill-accent'} />
                <span>{isTriggeringCycle || telemetry?.scheduler.is_running ? 'Cycle Running...' : 'Trigger Ingest'}</span>
              </button>

              {/* Refresh Metrics */}
              <button
                id="btn-control-room-refresh"
                onClick={() => {
                  fetchTelemetry();
                  fetchErrors();
                }}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-paper-border hover:border-ink bg-paper text-xs font-semibold rounded-xs transition-colors"
                title="Refresh real-time telemetry"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              {/* Close Button */}
              <button
                id="btn-control-room-close"
                onClick={() => setControlRoomOpen(false)}
                className="p-1.5 border border-paper-border hover:border-ink rounded-xs hover:bg-paper text-ink transition-colors ml-1"
                aria-label="Close Control Room"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 2. Navigation Tabs Bar */}
          <div className="border-b border-paper-border bg-paper px-4 flex flex-wrap items-center gap-1 shrink-0 text-xs font-ui">
            {[
              { id: 'overview', label: 'Operational Overview', icon: Activity },
              { id: 'sources', label: `Sources Freshness (${telemetry?.source_summary.total ?? 24})`, icon: Server },
              { id: 'scheduler-queues', label: 'Scheduler & Queues', icon: Clock },
              { id: 'ai-quotas', label: 'AI Providers & Quotas', icon: Cpu },
              { id: 'errors', label: `Error Ledger (${errorsTotal > 0 ? errorsTotal : (telemetry?.error_summary.total_24h ?? 0)})`, icon: AlertTriangle },
              { id: 'storage-modes', label: 'Storage & System Modes', icon: Database },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-control-room-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`flex items-center gap-1.5 py-2.5 px-3 font-semibold border-b-2 transition-all ${
                    isActive
                      ? 'border-accent text-accent bg-paper-alt/40'
                      : 'border-transparent text-ink-secondary hover:text-ink hover:border-paper-border'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 3. Desk Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-paper-alt/30 min-h-0">
            {isLoading && !telemetry ? (
              <div className="flex flex-col items-center justify-center h-64 text-ink-muted">
                <RefreshCw size={28} className="animate-spin mb-3 text-ink-secondary" />
                <span className="font-ui text-sm">Gathering desk telemetry from local SQLite wire...</span>
              </div>
            ) : error && !telemetry ? (
              <div className="p-6 border-2 border-accent bg-accent/10 rounded-xs text-ink">
                <div className="flex items-center gap-2 text-accent font-bold mb-2">
                  <AlertCircle size={18} />
                  <span>Failed to load Control Room Telemetry</span>
                </div>
                <p className="font-mono text-xs">{error}</p>
                <button
                  onClick={() => fetchTelemetry()}
                  className="mt-3 px-3 py-1.5 border border-accent bg-paper font-semibold text-xs rounded-xs"
                >
                  Retry Connection
                </button>
              </div>
            ) : telemetry ? (
              <>
                {/* ────────── TAB 1: OVERVIEW ────────── */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Top KPI Metric Ribbon */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* KPI 1: Source Freshness */}
                      <div className="p-3.5 border border-paper-border bg-paper rounded-xs">
                        <div className="flex items-center justify-between text-xs text-ink-secondary mb-1">
                          <span className="font-ui font-semibold uppercase tracking-wider">Sources Active</span>
                          <Server size={14} className="text-emerald-700" />
                        </div>
                        <div className="font-mono text-2xl font-bold text-ink">
                          {telemetry.source_summary.fresh} / {telemetry.source_summary.total}
                        </div>
                        <div className="font-ui text-[0.6875rem] text-ink-muted mt-1 flex items-center gap-2">
                          <span className="text-emerald-700 font-semibold">{telemetry.source_summary.fresh} Fresh</span>
                          {telemetry.source_summary.delayed > 0 && (
                            <span className="text-amber-700 font-semibold">{telemetry.source_summary.delayed} Delayed</span>
                          )}
                          {telemetry.source_summary.failing > 0 && (
                            <span className="text-accent font-bold">{telemetry.source_summary.failing} Failing</span>
                          )}
                        </div>
                      </div>

                      {/* KPI 2: Scheduler Status */}
                      <div className="p-3.5 border border-paper-border bg-paper rounded-xs">
                        <div className="flex items-center justify-between text-xs text-ink-secondary mb-1">
                          <span className="font-ui font-semibold uppercase tracking-wider">Scheduler Wire</span>
                          <Clock size={14} className="text-ink-secondary" />
                        </div>
                        <div className="font-mono text-2xl font-bold text-ink flex items-center gap-2">
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full ${
                              telemetry.scheduler.is_running ? 'bg-amber-500 animate-ping' : 'bg-emerald-600'
                            }`}
                          />
                          <span>{telemetry.scheduler.is_running ? 'FETCHING' : 'IDLE'}</span>
                        </div>
                        <div className="font-mono text-[0.6875rem] text-ink-muted mt-1">
                          Interval: {telemetry.scheduler.interval_minutes}m · Last:{' '}
                          {telemetry.scheduler.last_cycle_duration_ms
                            ? `${(telemetry.scheduler.last_cycle_duration_ms / 1000).toFixed(1)}s`
                            : 'N/A'}
                        </div>
                      </div>

                      {/* KPI 3: Ingestion Queues */}
                      <div className="p-3.5 border border-paper-border bg-paper rounded-xs">
                        <div className="flex items-center justify-between text-xs text-ink-secondary mb-1">
                          <span className="font-ui font-semibold uppercase tracking-wider">Dispatches</span>
                          <Layers size={14} className="text-ink-secondary" />
                        </div>
                        <div className="font-mono text-2xl font-bold text-ink">
                          {telemetry.storage.total_articles.toLocaleString()}
                        </div>
                        <div className="font-mono text-[0.6875rem] text-ink-muted mt-1">
                          {telemetry.queues.pass1_triaged} Triaged · {telemetry.queues.pass2_enriched} Enriched
                        </div>
                      </div>

                      {/* KPI 4: System Health & Storage */}
                      <div className="p-3.5 border border-paper-border bg-paper rounded-xs">
                        <div className="flex items-center justify-between text-xs text-ink-secondary mb-1">
                          <span className="font-ui font-semibold uppercase tracking-wider">SQLite Storage</span>
                          <HardDrive size={14} className="text-ink-secondary" />
                        </div>
                        <div className="font-mono text-2xl font-bold text-ink">
                          {telemetry.storage.db_size_formatted}
                        </div>
                        <div className="font-ui text-[0.6875rem] text-ink-muted mt-1 flex items-center gap-1.5">
                          <span className="font-semibold uppercase text-emerald-700">
                            {telemetry.storage.storage_health}
                          </span>
                          <span>(Limit: 2.0 GB)</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Wire Summary Rows */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Sources Quick Matrix */}
                      <div className="p-4 border border-paper-border bg-paper rounded-xs">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-paper-border">
                          <h3 className="font-headline font-bold text-sm text-ink flex items-center gap-1.5">
                            <Server size={14} />
                            <span>Feed Freshness Overview</span>
                          </h3>
                          <button
                            onClick={() => setActiveTab('sources')}
                            className="text-xs font-semibold text-accent hover:underline"
                          >
                            View All 24 Outlets →
                          </button>
                        </div>
                        <div className="space-y-2">
                          {telemetry.sources.slice(0, 5).map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between py-1.5 px-2 border border-paper-border/60 bg-paper-alt/40 rounded-xs text-xs font-ui"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[0.625rem] px-1 bg-paper border border-paper-border text-ink-secondary font-bold">
                                  {s.country.slice(0, 3).toUpperCase()}
                                </span>
                                <span className="font-semibold text-ink">{s.name}</span>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-[0.6875rem]">
                                <span className="text-ink-muted">
                                  {s.last_latency_ms ? `${s.last_latency_ms}ms` : '—'}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded-xs font-bold uppercase text-[0.625rem] ${
                                    s.freshness_tier === 'fresh'
                                      ? 'bg-emerald-600/10 text-emerald-800 dark:text-emerald-400 border border-emerald-600/30'
                                      : s.freshness_tier === 'delayed'
                                      ? 'bg-amber-600/10 text-amber-800 dark:text-amber-400 border border-amber-600/30'
                                      : 'bg-accent/10 text-accent border border-accent/30'
                                  }`}
                                >
                                  {s.freshness_tier}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: AI Provider & Quota Snapshot */}
                      <div className="p-4 border border-paper-border bg-paper rounded-xs">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-paper-border">
                          <h3 className="font-headline font-bold text-sm text-ink flex items-center gap-1.5">
                            <Cpu size={14} />
                            <span>AI Provider Fallback Wire</span>
                          </h3>
                          <button
                            onClick={() => setActiveTab('ai-quotas')}
                            className="text-xs font-semibold text-accent hover:underline"
                          >
                            Detailed Quotas →
                          </button>
                        </div>
                        <div className="space-y-2.5">
                          <div className="p-2.5 border border-paper-border bg-paper-alt/40 rounded-xs flex items-center justify-between">
                            <div>
                              <div className="text-[0.6875rem] font-ui text-ink-muted uppercase">Active Provider</div>
                              <div className="font-mono font-bold text-base text-ink uppercase">
                                {telemetry.ai_providers.current_provider}
                              </div>
                            </div>
                            <span className="font-mono text-xs px-2 py-1 bg-emerald-600/10 text-emerald-800 dark:text-emerald-400 border border-emerald-600/30 font-bold uppercase rounded-xs">
                              ONLINE
                            </span>
                          </div>

                          {/* Fallback Chain Visualization */}
                          <div>
                            <div className="text-[0.6875rem] font-ui text-ink-muted mb-1.5">Configured Fallback Chain:</div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {telemetry.ai_providers.chain.map((p, idx) => {
                                const isCurrent = p.name === telemetry.ai_providers.current_provider;
                                const isThrottled = telemetry.ai_providers.throttled[p.name]?.throttled;
                                return (
                                  <React.Fragment key={p.name}>
                                    <span
                                      className={`px-2 py-1 font-mono text-xs rounded-xs border font-bold uppercase ${
                                        isCurrent
                                          ? 'border-accent bg-accent/10 text-accent'
                                          : isThrottled
                                          ? 'border-amber-600/40 bg-amber-500/10 text-amber-700'
                                          : 'border-paper-border bg-paper text-ink-secondary'
                                      }`}
                                    >
                                      {p.name} {isCurrent && '★'}
                                    </span>
                                    {idx < telemetry.ai_providers.chain.length - 1 && (
                                      <span className="text-ink-muted font-mono text-xs">→</span>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>

                          {/* Two-Pass Savings Stamp */}
                          <div className="p-2 border border-paper-border/80 bg-paper rounded-xs flex items-center justify-between text-xs font-ui">
                            <span className="text-ink-secondary">Two-Pass Token Savings:</span>
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              ~{telemetry.ai_providers.two_pass.estimated_tokens_saved.toLocaleString()} tokens saved
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Latest Errors Callout if any */}
                    {telemetry.error_summary.latest_error && (
                      <div className="p-4 border-2 border-amber-600/50 bg-amber-500/5 rounded-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-700" />
                            <span className="font-headline font-bold text-xs uppercase text-amber-900 dark:text-amber-300">
                              Latest System Diagnostic Log
                            </span>
                            <span className="font-mono text-[0.625rem] px-1.5 py-0.5 border border-amber-600/30 bg-amber-600/10 text-amber-800 rounded-xs uppercase">
                              {telemetry.error_summary.latest_error.subsystem}
                            </span>
                          </div>
                          <button
                            onClick={() => setActiveTab('errors')}
                            className="font-ui text-xs font-bold text-accent hover:underline"
                          >
                            Inspect Ledger ({telemetry.error_summary.total_24h} in 24h) →
                          </button>
                        </div>
                        <p className="font-mono text-xs text-ink">
                          {telemetry.error_summary.latest_error.message}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ────────── TAB 2: SOURCES FRESHNESS MATRIX ────────── */}
                {activeTab === 'sources' && (
                  <div className="space-y-4">
                    {/* Filter Ribbon */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-paper-border">
                      <div className="flex items-center gap-1.5 text-xs font-ui">
                        <span className="text-ink-muted uppercase font-bold tracking-wider mr-1">Filter:</span>
                        {[
                          { id: 'all', label: `All (${telemetry.sources.length})` },
                          { id: 'fresh', label: `Fresh (${telemetry.source_summary.fresh})` },
                          { id: 'delayed', label: `Delayed (${telemetry.source_summary.delayed})` },
                          { id: 'failing', label: `Failing (${telemetry.source_summary.failing})` },
                          { id: 'disabled', label: `Disabled (${telemetry.source_summary.disabled})` },
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            onClick={() => setSourceFilterTier(btn.id)}
                            className={`px-2.5 py-1 rounded-xs border text-xs font-semibold transition-colors ${
                              sourceFilterTier === btn.id
                                ? 'border-ink bg-paper text-ink shadow-xs'
                                : 'border-transparent text-ink-secondary hover:text-ink'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>

                      <div className="font-mono text-xs text-ink-muted">
                        Avg Latency: <span className="font-bold text-ink">{telemetry.source_summary.avg_latency_ms}ms</span>
                      </div>
                    </div>

                    {/* Sources Broadsheet Table */}
                    <div className="border border-paper-border bg-paper rounded-xs overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b-2 border-ink bg-paper-alt font-headline text-ink">
                            <th className="p-2.5">Outlet & Country</th>
                            <th className="p-2.5">Protocol</th>
                            <th className="p-2.5">Last Arrival</th>
                            <th className="p-2.5">Latency</th>
                            <th className="p-2.5">Errors</th>
                            <th className="p-2.5">Freshness Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-paper-border font-ui">
                          {filteredSources.map((source) => (
                            <tr key={source.id} className="hover:bg-paper-alt/50 transition-colors">
                              <td className="p-2.5">
                                <div className="font-bold text-ink flex items-center gap-2">
                                  <span className="font-mono text-[0.625rem] px-1 bg-paper-alt border border-paper-border rounded-xs">
                                    {source.country.slice(0, 3).toUpperCase()}
                                  </span>
                                  <span>{source.name}</span>
                                </div>
                                <div className="font-mono text-[0.625rem] text-ink-muted truncate max-w-xs">
                                  {source.url}
                                </div>
                              </td>
                              <td className="p-2.5 font-mono uppercase text-ink-secondary">
                                {source.fetch_type}
                              </td>
                              <td className="p-2.5 font-mono text-ink">
                                {source.last_fetched_at ? (
                                  <span>
                                    {source.minutes_since_fetch !== null
                                      ? `${source.minutes_since_fetch}m ago`
                                      : 'Recently'}
                                  </span>
                                ) : (
                                  <span className="text-ink-muted">Never</span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono text-ink">
                                {source.last_latency_ms !== null ? `${source.last_latency_ms}ms` : '—'}
                              </td>
                              <td className="p-2.5 font-mono">
                                {source.error_count > 0 ? (
                                  <span className="text-accent font-bold">{source.error_count} errors</span>
                                ) : (
                                  <span className="text-ink-muted">0</span>
                                )}
                              </td>
                              <td className="p-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded-xs font-mono font-bold uppercase text-[0.625rem] inline-block ${
                                    source.freshness_tier === 'fresh'
                                      ? 'bg-emerald-600/10 text-emerald-800 dark:text-emerald-400 border border-emerald-600/40'
                                      : source.freshness_tier === 'delayed'
                                      ? 'bg-amber-600/10 text-amber-800 dark:text-amber-400 border border-amber-600/40'
                                      : source.freshness_tier === 'disabled'
                                      ? 'bg-paper-alt text-ink-muted border border-paper-border'
                                      : 'bg-accent/10 text-accent border border-accent/40'
                                  }`}
                                >
                                  {source.freshness_tier}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ────────── TAB 3: SCHEDULER & QUEUES ────────── */}
                {activeTab === 'scheduler-queues' && (
                  <div className="space-y-6">
                    {/* Scheduler Operational Card */}
                    <div className="p-5 border border-paper-border bg-paper rounded-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-paper-border mb-4">
                        <div>
                          <h3 className="font-headline font-bold text-base text-ink">Scheduler Dispatch Engine</h3>
                          <p className="font-ui text-xs text-ink-secondary">
                            Automated background polling, gap recovery, and cycle durations
                          </p>
                        </div>
                        <span
                          className={`font-mono text-xs px-2.5 py-1 rounded-xs font-bold uppercase ${
                            telemetry.scheduler.is_running
                              ? 'bg-amber-500/10 text-amber-800 border border-amber-500/40'
                              : 'bg-emerald-600/10 text-emerald-800 dark:text-emerald-400 border border-emerald-600/40'
                          }`}
                        >
                          {telemetry.scheduler.is_running ? 'Cycle In Progress' : 'Scheduler Running'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-ui">
                        <div>
                          <div className="text-ink-muted uppercase font-bold text-[0.625rem]">Cycle Interval</div>
                          <div className="font-mono text-lg font-bold text-ink mt-0.5">
                            {telemetry.scheduler.interval_minutes} minutes
                          </div>
                        </div>
                        <div>
                          <div className="text-ink-muted uppercase font-bold text-[0.625rem]">Last Run Duration</div>
                          <div className="font-mono text-lg font-bold text-ink mt-0.5">
                            {telemetry.scheduler.last_cycle_duration_ms
                              ? `${(telemetry.scheduler.last_cycle_duration_ms / 1000).toFixed(2)}s`
                              : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-ink-muted uppercase font-bold text-[0.625rem]">Last Cycle Fetched</div>
                          <div className="font-mono text-lg font-bold text-ink mt-0.5">
                            {telemetry.scheduler.last_cycle_articles_fetched} dispatches
                          </div>
                        </div>
                        <div>
                          <div className="text-ink-muted uppercase font-bold text-[0.625rem]">New Dispatches Ingested</div>
                          <div className="font-mono text-lg font-bold text-ink mt-0.5">
                            {telemetry.scheduler.last_cycle_new_articles} new
                          </div>
                        </div>
                      </div>

                      {/* Startup Hiatus / Gap Details */}
                      {telemetry.scheduler.startup_gap.detected && (
                        <div className="mt-4 p-3 border border-amber-600/40 bg-amber-500/10 rounded-xs text-xs font-ui text-amber-900 dark:text-amber-200">
                          <span className="font-bold">Offline Hiatus Detected:</span> The laptop/app was closed for{' '}
                          <span className="font-mono font-bold">{telemetry.scheduler.startup_gap.missed_minutes} minutes</span>{' '}
                          prior to startup.
                        </div>
                      )}
                    </div>

                    {/* Queues Pipeline Status */}
                    <div className="p-5 border border-paper-border bg-paper rounded-xs">
                      <h3 className="font-headline font-bold text-base text-ink mb-1">
                        Ingestion & Triage Queue Breakdown
                      </h3>
                      <p className="font-ui text-xs text-ink-secondary mb-4">
                        State of dispatches through Pass 1 lightweight triage and Pass 2 comprehensive enrichment
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        <div className="p-3 border border-paper-border bg-paper-alt/50 rounded-xs">
                          <div className="text-[0.625rem] font-bold text-ink-muted uppercase">Pending</div>
                          <div className="font-mono text-xl font-bold text-ink mt-1">{telemetry.queues.pending}</div>
                        </div>
                        <div className="p-3 border border-paper-border bg-paper-alt/50 rounded-xs">
                          <div className="text-[0.625rem] font-bold text-ink-muted uppercase">Processing</div>
                          <div className="font-mono text-xl font-bold text-ink mt-1">{telemetry.queues.processing}</div>
                        </div>
                        <div className="p-3 border border-paper-border bg-paper-alt/50 rounded-xs">
                          <div className="text-[0.625rem] font-bold text-ink-muted uppercase">Pass 1 Scored</div>
                          <div className="font-mono text-xl font-bold text-ink mt-1">{telemetry.queues.pass1_triaged}</div>
                        </div>
                        <div className="p-3 border border-paper-border bg-paper-alt/50 rounded-xs">
                          <div className="text-[0.625rem] font-bold text-ink-muted uppercase">Pass 2 Enriched</div>
                          <div className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                            {telemetry.queues.pass2_enriched}
                          </div>
                        </div>
                        <div className="p-3 border border-paper-border bg-paper-alt/50 rounded-xs">
                          <div className="text-[0.625rem] font-bold text-ink-muted uppercase">Pass 2 Deferred</div>
                          <div className="font-mono text-xl font-bold text-ink-secondary mt-1">
                            {telemetry.queues.pass2_deferred}
                          </div>
                        </div>
                        <div className="p-3 border border-paper-border bg-paper-alt/50 rounded-xs">
                          <div className="text-[0.625rem] font-bold text-accent uppercase">AI Failed</div>
                          <div className="font-mono text-xl font-bold text-accent mt-1">{telemetry.queues.ai_failed}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ────────── TAB 4: AI PROVIDERS & QUOTAS ────────── */}
                {activeTab === 'ai-quotas' && (
                  <div className="space-y-6">
                    {/* Active Provider & Chain Header */}
                    <div className="p-5 border border-paper-border bg-paper rounded-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-paper-border mb-4">
                        <div>
                          <h3 className="font-headline font-bold text-base text-ink">AI Provider Fallback Chain</h3>
                          <p className="font-ui text-xs text-ink-secondary">
                            Automatic fallback triggers on HTTP 429, 503, or 20s timeout without interrupting ingestion
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-ui text-xs text-ink-muted">Active:</span>
                          <span className="font-mono text-xs px-2.5 py-1 bg-accent/10 border border-accent text-accent font-bold uppercase rounded-xs">
                            {telemetry.ai_providers.current_provider}
                          </span>
                        </div>
                      </div>

                      {/* Providers Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {telemetry.ai_providers.chain.map((provider) => {
                          const stats = telemetry.ai_providers.stats_today[provider.name];
                          const throttled = telemetry.ai_providers.throttled[provider.name];
                          const isCurrent = provider.name === telemetry.ai_providers.current_provider;

                          return (
                            <div
                              key={provider.name}
                              className={`p-3.5 border rounded-xs ${
                                isCurrent
                                  ? 'border-accent bg-accent/5'
                                  : 'border-paper-border bg-paper-alt/40'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-headline font-bold text-sm text-ink uppercase">
                                  {provider.name}
                                </span>
                                {throttled?.throttled ? (
                                  <span className="font-mono text-[0.625rem] px-1.5 py-0.5 bg-amber-600/10 text-amber-800 border border-amber-600/30 rounded-xs uppercase font-bold">
                                    Throttled ({throttled.remainingSec}s)
                                  </span>
                                ) : isCurrent ? (
                                  <span className="font-mono text-[0.625rem] px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/30 rounded-xs uppercase font-bold">
                                    Active
                                  </span>
                                ) : (
                                  <span className="font-mono text-[0.625rem] px-1.5 py-0.5 bg-paper text-ink-muted border border-paper-border rounded-xs uppercase">
                                    Standby
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[0.625rem] text-ink-muted truncate mb-3">
                                {provider.model}
                              </div>

                              <div className="space-y-1 font-mono text-xs text-ink">
                                <div className="flex justify-between">
                                  <span className="text-ink-muted">Calls Today:</span>
                                  <span className="font-bold">{stats?.callsToday ?? 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-ink-muted">Tokens Today:</span>
                                  <span className="font-bold">{(stats?.tokensToday ?? 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-ink-muted">Errors:</span>
                                  <span className={stats?.errorsToday ? 'text-accent font-bold' : 'text-ink-muted'}>
                                    {stats?.errorsToday ?? 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Two-Pass Telemetry & Economics */}
                    <div className="p-5 border border-paper-border bg-paper rounded-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-paper-border mb-4">
                        <div>
                          <h3 className="font-headline font-bold text-base text-ink">Two-Pass AI Quota Economics</h3>
                          <p className="font-ui text-xs text-ink-secondary">
                            Lightweight triage (~60 tokens) vs full summary (~800 tokens) token savings tracker
                          </p>
                        </div>
                        <span className="font-mono text-xs px-2.5 py-1 bg-emerald-600/10 border border-emerald-600/30 text-emerald-800 dark:text-emerald-400 font-bold uppercase rounded-xs">
                          ~740 tokens saved / skip
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-ui">
                        <div className="p-3 border border-paper-border bg-paper-alt/40 rounded-xs">
                          <div className="text-ink-muted uppercase font-bold text-[0.625rem]">Pass 1 Triaged</div>
                          <div className="font-mono text-xl font-bold text-ink mt-1">
                            {telemetry.ai_providers.two_pass.pass1_count.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-3 border border-paper-border bg-paper-alt/40 rounded-xs">
                          <div className="text-ink-muted uppercase font-bold text-[0.625rem]">Pass 2 Enriched</div>
                          <div className="font-mono text-xl font-bold text-ink mt-1">
                            {telemetry.ai_providers.two_pass.pass2_count.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-3 border border-paper-border bg-paper-alt/40 rounded-xs">
                          <div className="text-ink-muted uppercase font-bold text-[0.625rem]">Deferred (Pass 1 Only)</div>
                          <div className="font-mono text-xl font-bold text-ink mt-1">
                            {telemetry.ai_providers.two_pass.pass2_skipped_count.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-3 border border-paper-border bg-paper-alt/40 rounded-xs">
                          <div className="text-ink-muted uppercase font-bold text-[0.625rem]">Estimated Tokens Saved</div>
                          <div className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                            ~{telemetry.ai_providers.two_pass.estimated_tokens_saved.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ────────── TAB 5: ERROR LEDGER ────────── */}
                {activeTab === 'errors' && (
                  <div className="space-y-4">
                    {/* Filter Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-paper-border">
                      <div className="flex items-center flex-wrap gap-2 text-xs font-ui">
                        {/* Subsystem Filter */}
                        <div className="flex items-center gap-1">
                          <span className="text-ink-muted uppercase font-bold text-[0.625rem]">Subsystem:</span>
                          <select
                            id="select-error-subsystem"
                            value={selectedSubsystem}
                            onChange={(e) => setSelectedSubsystem(e.target.value)}
                            className="px-2 py-1 border border-paper-border bg-paper text-ink rounded-xs font-mono text-xs focus:border-ink outline-none"
                          >
                            <option value="all">All Subsystems</option>
                            <option value="fetcher">Fetcher</option>
                            <option value="ai">AI Pipeline</option>
                            <option value="scheduler">Scheduler</option>
                            <option value="db">Database</option>
                            <option value="tv">Live TV</option>
                            <option value="system">System</option>
                          </select>
                        </div>

                        {/* Level Filter */}
                        <div className="flex items-center gap-1 ml-2">
                          <span className="text-ink-muted uppercase font-bold text-[0.625rem]">Level:</span>
                          <select
                            id="select-error-level"
                            value={selectedLevel}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                            className="px-2 py-1 border border-paper-border bg-paper text-ink rounded-xs font-mono text-xs focus:border-ink outline-none"
                          >
                            <option value="all">All Levels</option>
                            <option value="error">Error</option>
                            <option value="warn">Warning</option>
                            <option value="info">Info</option>
                          </select>
                        </div>

                        {/* Search Input */}
                        <div className="relative ml-2">
                          <Search size={13} className="absolute left-2 top-2 text-ink-muted" />
                          <input
                            id="input-error-search"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search log messages..."
                            className="pl-6 pr-2 py-1 border border-paper-border bg-paper text-ink rounded-xs font-ui text-xs w-48 focus:border-ink outline-none"
                          />
                        </div>
                      </div>

                      {/* Clear Button */}
                      <button
                        id="btn-clear-error-ledger"
                        onClick={handleClearErrors}
                        className="flex items-center gap-1.5 px-3 py-1 border border-paper-border hover:border-accent hover:text-accent bg-paper text-xs font-semibold rounded-xs transition-colors"
                      >
                        <Trash2 size={13} />
                        <span>Clear Ledger</span>
                      </button>
                    </div>

                    {/* Errors List / Table */}
                    <div ref={errorsContainerRef} className="border border-paper-border bg-paper rounded-xs overflow-hidden">
                      {isErrorsLoading ? (
                        <div className="p-8 text-center text-ink-muted font-ui text-xs">
                          Querying system event ledger...
                        </div>
                      ) : errors.length === 0 ? (
                        <div className="p-12 text-center text-ink-muted">
                          <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-700 opacity-60" />
                          <div className="font-headline font-bold text-sm text-ink">System Error Ledger Clean</div>
                          <p className="font-ui text-xs text-ink-secondary mt-1">
                            No system errors or diagnostic exceptions recorded for the selected filter.
                          </p>
                        </div>
                      ) : (
                        <>
                          <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b-2 border-ink bg-paper-alt font-headline text-ink">
                              <th className="p-2.5">Timestamp (UTC)</th>
                              <th className="p-2.5">Subsystem</th>
                              <th className="p-2.5">Level</th>
                              <th className="p-2.5">Diagnostic Message</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-paper-border font-ui">
                            {visibleErrors.map((err) => {
                              const isExpanded = expandedErrorId === err.id;
                              return (
                                <React.Fragment key={err.id}>
                                  <tr
                                    onClick={() => setExpandedErrorId(isExpanded ? null : err.id)}
                                    className="hover:bg-paper-alt/50 cursor-pointer transition-colors animate-row-fade-in"
                                  >
                                    <td className="p-2.5 font-mono tabular-nums text-ink-secondary whitespace-nowrap">
                                      {err.timestamp.replace('T', ' ').replace('Z', '')}
                                    </td>
                                    <td className="p-2.5 font-mono uppercase text-ink-muted">
                                      [{err.subsystem}]
                                    </td>
                                    <td className="p-2.5">
                                      <span
                                        className={`px-1.5 py-0.5 rounded-xs font-mono font-bold uppercase text-[0.625rem] ${
                                          err.level === 'error'
                                            ? 'bg-accent/10 text-accent border border-accent/40'
                                            : err.level === 'warn'
                                            ? 'bg-amber-600/10 text-amber-800 dark:text-amber-400 border border-amber-600/40'
                                            : 'bg-paper-alt text-ink-secondary border border-paper-border'
                                        }`}
                                      >
                                        {err.level}
                                      </span>
                                    </td>
                                    <td className="p-2.5 font-mono text-ink">
                                      <div className="line-clamp-2">{err.message}</div>
                                    </td>
                                  </tr>
                                  {isExpanded && err.details && (
                                    <tr className="bg-paper-alt/80 border-t border-paper-border">
                                      <td colSpan={4} className="p-3 font-mono text-[0.6875rem] text-ink overflow-x-auto">
                                        <div className="font-bold mb-1 text-ink-secondary uppercase">
                                          Diagnostic Context:
                                        </div>
                                        <pre className="p-2 bg-paper border border-paper-border rounded-xs overflow-x-auto whitespace-pre-wrap">
                                          {err.details}
                                        </pre>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                        {hasMoreErrors && (
                          <div className="p-2.5 text-center border-t border-paper-border bg-paper-alt">
                            <button
                              type="button"
                              onClick={showMoreErrors}
                              className="px-3 py-1 border border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs font-mono text-xs font-bold transition-colors cursor-pointer"
                            >
                              Show more error entries ({visibleErrors.length} / {errors.length})
                            </button>
                          </div>
                        )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* ────────── TAB 6: STORAGE & MODES ────────── */}
                {activeTab === 'storage-modes' && (
                  <div className="space-y-6">
                    {/* Storage & Limits */}
                    <div className="p-5 border border-paper-border bg-paper rounded-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-paper-border mb-4">
                        <div>
                          <h3 className="font-headline font-bold text-base text-ink">Physical SQLite Storage & Safety Net</h3>
                          <p className="font-ui text-xs text-ink-secondary">
                            Automatic WAL flush, retention immunity, and file size guardrails (NF-3)
                          </p>
                        </div>
                        <span className="font-mono text-xs px-2.5 py-1 bg-emerald-600/10 border border-emerald-600/30 text-emerald-800 dark:text-emerald-400 font-bold uppercase rounded-xs">
                          {telemetry.storage.storage_health.toUpperCase()}
                        </span>
                      </div>

                      {/* Storage Progress Bar */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-xs font-mono">
                          <span>
                            File Size: <strong className="text-ink">{telemetry.storage.db_size_formatted}</strong>
                          </span>
                          <span className="text-ink-muted">
                            Warn: 1.5 GB · Limit: 2.0 GB
                          </span>
                        </div>
                        <div className="w-full h-3 bg-paper-border rounded-xs overflow-hidden relative">
                          <div
                            className={`h-full transition-all ${
                              telemetry.storage.storage_health === 'critical'
                                ? 'bg-accent'
                                : telemetry.storage.storage_health === 'warning'
                                ? 'bg-amber-600'
                                : 'bg-emerald-600'
                            }`}
                            style={{
                              width: `${Math.min(100, (telemetry.storage.db_size_mb / 2048) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-ui">
                        <div>
                          <div className="text-ink-muted uppercase font-bold text-[0.625rem]">Total Articles In DB</div>
                          <div className="font-mono text-lg font-bold text-ink mt-0.5">
                            {telemetry.storage.total_articles.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-ink-muted uppercase font-bold text-[0.625rem]">Clustered Stories</div>
                          <div className="font-mono text-lg font-bold text-ink mt-0.5">
                            {telemetry.storage.total_clusters.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-ink-muted uppercase font-bold text-[0.625rem]">Backups Preserved</div>
                          <div className="font-mono text-lg font-bold text-ink mt-0.5">
                            {telemetry.storage.backups_count} snapshots
                          </div>
                        </div>
                        <div>
                          <div className="text-ink-muted uppercase font-bold text-[0.625rem]">Latest Snapshot</div>
                          <div className="font-mono text-xs font-bold text-ink mt-0.5 truncate">
                            {telemetry.storage.latest_backup?.filename ?? 'None'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Operating Modes Switches */}
                    <div className="p-5 border border-paper-border bg-paper rounded-xs">
                      <h3 className="font-headline font-bold text-base text-ink mb-1">
                        System Operating Modes & Controls
                      </h3>
                      <p className="font-ui text-xs text-ink-secondary mb-4">
                        Master switches for zero-AI Plain Mode, Two-Pass triage, and auto-advance timers
                      </p>

                      <div className="space-y-4">
                        {/* Plain Mode Toggle */}
                        <div className="flex items-center justify-between p-3.5 border border-paper-border bg-paper-alt/40 rounded-xs">
                          <div>
                            <div className="font-headline font-bold text-sm text-ink">Plain Mode (Zero AI)</div>
                            <div className="font-ui text-xs text-ink-secondary">
                              Completely bypasses external AI APIs. Uses deterministic lexical categorizer and full-width reader.
                            </div>
                          </div>
                          <button
                            id="btn-toggle-plain-mode-control-room"
                            onClick={async () => {
                              await updateSettings({ plain_mode_enabled: !telemetry.modes.plain_mode_enabled });
                              fetchTelemetry();
                            }}
                            className={`px-3 py-1.5 border font-mono text-xs font-bold rounded-xs transition-colors ${
                              telemetry.modes.plain_mode_enabled
                                ? 'border-accent bg-accent text-paper'
                                : 'border-paper-border bg-paper text-ink-muted'
                            }`}
                          >
                            {telemetry.modes.plain_mode_enabled ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </div>

                        {/* Two-Pass AI Toggle */}
                        <div className="flex items-center justify-between p-3.5 border border-paper-border bg-paper-alt/40 rounded-xs">
                          <div>
                            <div className="font-headline font-bold text-sm text-ink">Two-Pass AI Ingestion</div>
                            <div className="font-ui text-xs text-ink-secondary">
                              Scores news urgency via Pass 1 triage prompt. Defers full summary until Pass 2 threshold or user click.
                            </div>
                          </div>
                          <button
                            id="btn-toggle-two-pass-control-room"
                            onClick={async () => {
                              await updateSettings({ two_pass_ai_enabled: !telemetry.modes.two_pass_ai_enabled });
                              fetchTelemetry();
                            }}
                            className={`px-3 py-1.5 border font-mono text-xs font-bold rounded-xs transition-colors ${
                              telemetry.modes.two_pass_ai_enabled
                                ? 'border-emerald-700 bg-emerald-700 text-paper'
                                : 'border-paper-border bg-paper text-ink-muted'
                            }`}
                          >
                            {telemetry.modes.two_pass_ai_enabled ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </div>

                        {/* Auto-Advance Status */}
                        <div className="flex items-center justify-between p-3.5 border border-paper-border bg-paper-alt/40 rounded-xs">
                          <div>
                            <div className="font-headline font-bold text-sm text-ink">Auto-Advance Reader Timer</div>
                            <div className="font-ui text-xs text-ink-secondary">
                              Current countdown interval: {telemetry.modes.auto_advance_interval_sec} seconds. Pauses on left-panel hover.
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold px-3 py-1.5 border border-paper-border bg-paper text-ink rounded-xs">
                            {telemetry.modes.auto_advance_enabled ? 'ACTIVE' : 'OFF'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* 4. Bottom Footer Status Bar */}
          <div className="border-t border-paper-border p-3 bg-paper flex flex-wrap items-center justify-between gap-3 text-[0.6875rem] font-mono text-ink-muted shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-ink font-semibold">Live SSE Synchronized</span>
              </span>
              <span>·</span>
              <span>Server UTC: {telemetry?.server_time ?? new Date().toISOString()}</span>
            </div>
            <div>
              The World Desk Operations Telemetry Wire · Single-User Local Station
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ControlRoomDesk;
