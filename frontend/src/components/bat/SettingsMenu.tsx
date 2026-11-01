/**
 * frontend/src/components/bat/SettingsMenu.tsx
 * Slide-out control center drawer for news sources, AI chain, spider controls, and sound settings.
 */
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Sliders, Activity, Volume2, VolumeX, ShieldAlert, Database, Bell, Trash2, Plus, Calendar, BookmarkCheck, FileText, Download, Radio } from 'lucide-react';
import { QuotaMeter } from '../quota/QuotaMeter';
import { getNotificationPermission, requestNotificationPermission, isNotificationSupported } from '../../utils/notifications';
import type { WatchlistItem } from '../../types';

export const SettingsMenu: React.FC = () => {
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setBriefingOpen = useAppStore((s) => s.setBriefingOpen);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => getNotificationPermission());
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
      });
      if (!res.ok) throw new Error('PDF export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI_World_News_Desk_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Unable to generate PDF at this moment. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [isAddingTopic, setIsAddingTopic] = useState(false);

  const fetchWatchlist = async () => {
    try {
      const res = await fetch('/api/watchlist');
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
    }
  };

  useEffect(() => {
    if (isSettingsOpen) {
      fetchWatchlist();
    }
  }, [isSettingsOpen]);

  const handleAddWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    try {
      const kws = newKeywords.split(',').map((k) => k.trim()).filter(Boolean);
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: newTopic.trim(),
          keywords: kws,
          priority: newPriority,
        }),
      });
      if (res.ok) {
        setNewTopic('');
        setNewKeywords('');
        setIsAddingTopic(false);
        fetchWatchlist();
      }
    } catch (err) {
      console.error('Failed to add watchlist item:', err);
    }
  };

  const handleToggleWatchlist = async (id: number, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/watchlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.ok) fetchWatchlist();
    } catch (err) {
      console.error('Failed to toggle watchlist item:', err);
    }
  };

  const handleDeleteWatchlist = async (id: number) => {
    try {
      const res = await fetch(`/api/watchlist/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchWatchlist();
    } catch (err) {
      console.error('Failed to delete watchlist item:', err);
    }
  };

  const handleRequestNotif = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
  };

  if (!isSettingsOpen) return null;

  return (
    <div
      id="settings-drawer-backdrop"
      onClick={() => setSettingsOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-start',
      }}
    >
      <div
        id="settings-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '380px',
          maxWidth: '85vw',
          height: '100%',
          backgroundColor: '#0d1322',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          animation: 'slideRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(17, 24, 39, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🦇</span>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                System Controls
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#64748b' }}>AI World News Desk Radar</p>
            </div>
          </div>

          <button
            id="close-settings-btn"
            onClick={() => setSettingsOpen(false)}
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '6px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body — Scrollable settings sections */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Section 1: Fetch Timing & Sources */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '0.82rem', fontWeight: 700 }}>
              <Sliders size={15} />
              <span>RADAR REFRESH FREQUENCY</span>
            </div>

            <div style={{ background: 'rgba(17, 24, 39, 0.7)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Polling Cycle:</span>
                <span style={{ fontWeight: 700, color: '#a5b4fc' }}>{settings.refresh_interval_minutes} minutes</span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                value={settings.refresh_interval_minutes}
                onChange={(e) => updateSettings({ refresh_interval_minutes: parseInt(e.target.value, 10) })}
                style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
                <span>1 min</span>
                <span>30 min</span>
                <span>60 min</span>
              </div>
            </div>
          </div>

          {/* Section 2: AI Provider Fallback & Quotas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <QuotaMeter />
          </div>

          {/* Section 3: Spider Animation Config */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontSize: '0.82rem', fontWeight: 700 }}>
              <Activity size={15} />
              <span>SPIDER RADAR ENGINES</span>
            </div>

            <div style={{ background: 'rgba(17, 24, 39, 0.7)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Max Concurrency:</span>
                <span style={{ fontWeight: 700, color: '#c4b5fd' }}>{settings.max_spiders} spiders</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={settings.max_spiders}
                onChange={(e) => updateSettings({ max_spiders: parseInt(e.target.value, 10) })}
                style={{ width: '100%', accentColor: '#a78bfa', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Section 4: Alerts & Audio Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '0.82rem', fontWeight: 700 }}>
              <ShieldAlert size={15} />
              <span>AUDIO & BREAKING SENSITIVITY</span>
            </div>

            <div style={{ background: 'rgba(17, 24, 39, 0.7)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Sound Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {settings.sound_enabled ? <Volume2 size={16} color="#22c55e" /> : <VolumeX size={16} color="#ef4444" />}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>UI Tactile & Chime Sounds</span>
                </div>
                <button
                  id="sound-toggle-btn"
                  onClick={() => updateSettings({ sound_enabled: !settings.sound_enabled })}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: settings.sound_enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: settings.sound_enabled ? '#22c55e' : '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {settings.sound_enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Desktop Notification Toggle (P6-04) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} color={notifPermission === 'granted' ? '#22c55e' : '#94a3b8'} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Desktop Notifications</span>
                </div>
                {isNotificationSupported() ? (
                  <button
                    id="btn-notif-permission"
                    onClick={handleRequestNotif}
                    disabled={notifPermission === 'granted'}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background:
                        notifPermission === 'granted'
                          ? 'rgba(34, 197, 94, 0.2)'
                          : notifPermission === 'denied'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(99, 102, 241, 0.2)',
                      color:
                        notifPermission === 'granted'
                          ? '#22c55e'
                          : notifPermission === 'denied'
                          ? '#ef4444'
                          : '#818cf8',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: notifPermission === 'granted' ? 'default' : 'pointer',
                    }}
                  >
                    {notifPermission === 'granted'
                      ? 'ENABLED'
                      : notifPermission === 'denied'
                      ? 'BLOCKED'
                      : 'ENABLE'}
                  </button>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>UNSUPPORTED</span>
                )}
              </div>

              {/* Alert threshold slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Breaking Score Threshold:</span>
                  <span style={{ fontWeight: 700, color: '#ef4444' }}>{settings.alert_threshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={settings.alert_threshold}
                  onChange={(e) => updateSettings({ alert_threshold: parseInt(e.target.value, 10) })}
                  style={{ width: '100%', accentColor: '#ef4444', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Topic Watchlist (P8-01, P8-02) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookmarkCheck size={16} color="var(--accent-primary)" />
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Topic Watchlist ({watchlist.length})
                </h4>
              </div>
              <button
                onClick={() => setIsAddingTopic((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  borderRadius: '6px',
                  color: '#818cf8',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={12} />
                <span>{isAddingTopic ? 'Cancel' : 'Add Topic'}</span>
              </button>
            </div>

            {/* Add Topic Form */}
            {isAddingTopic && (
              <form
                onSubmit={handleAddWatchlist}
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <input
                  type="text"
                  placeholder="Topic name (e.g. Wildlife Smuggling)..."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  style={{
                    background: '#0a0e1a',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#f8fafc',
                    fontSize: '0.78rem',
                  }}
                  required
                />
                <input
                  type="text"
                  placeholder="Keywords (comma-separated)..."
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  style={{
                    background: '#0a0e1a',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#f8fafc',
                    fontSize: '0.78rem',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as 'low' | 'normal' | 'high')}
                    style={{
                      background: '#0a0e1a',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: '#f8fafc',
                      fontSize: '0.75rem',
                    }}
                  >
                    <option value="low">Low Priority</option>
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                  <button
                    type="submit"
                    style={{
                      background: 'var(--accent-primary)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#ffffff',
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Save Monitor
                  </button>
                </div>
              </form>
            )}

            {/* Watchlist Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {watchlist.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', padding: '6px 0' }}>
                  No active topic monitors. Add topics to trigger real-time radar alerts.
                </div>
              ) : (
                watchlist.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.4)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#f8fafc' }}>
                        {item.topic}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background:
                              item.priority === 'high'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : item.priority === 'normal'
                                ? 'rgba(99, 102, 241, 0.2)'
                                : 'rgba(100, 116, 139, 0.2)',
                            color:
                              item.priority === 'high'
                                ? '#ef4444'
                                : item.priority === 'normal'
                                ? '#818cf8'
                                : '#94a3b8',
                          }}
                        >
                          {item.priority}
                        </span>
                        <button
                          onClick={() => handleToggleWatchlist(item.id, item.enabled)}
                          title={item.enabled ? 'Disable Monitor' : 'Enable Monitor'}
                          style={{
                            background: item.enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            color: item.enabled ? '#22c55e' : '#94a3b8',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '2px 6px',
                            cursor: 'pointer',
                          }}
                        >
                          {item.enabled ? 'ACTIVE' : 'OFF'}
                        </button>
                        <button
                          onClick={() => handleDeleteWatchlist(item.id)}
                          title="Delete Monitor"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {item.keywords && item.keywords.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                        {item.keywords.map((kw, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.68rem',
                              background: 'rgba(15, 23, 42, 0.8)',
                              color: 'var(--text-secondary)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 6: Data Retention & Storage Policy (P8-06, P8-07, P8-08) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="var(--accent-warning)" />
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Data Retention &amp; Storage
              </h4>
            </div>

            <div
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Auto Cleanup Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Automated Nightly Purge
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Runs daily at 03:00; preserves bookmarked articles
                  </div>
                </div>
                <button
                  id="btn-toggle-auto-cleanup"
                  onClick={() => updateSettings({ auto_cleanup_enabled: !settings.auto_cleanup_enabled })}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: settings.auto_cleanup_enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                    color: settings.auto_cleanup_enabled ? '#22c55e' : '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {settings.auto_cleanup_enabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Retention Days */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Retention Window:</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-warning)' }}>
                    {settings.retention_days} Days
                  </span>
                </div>
                <input
                  type="range"
                  min="7"
                  max="90"
                  step="1"
                  value={settings.retention_days}
                  onChange={(e) => updateSettings({ retention_days: parseInt(e.target.value, 10) })}
                  style={{ width: '100%', accentColor: 'var(--accent-warning)', cursor: 'pointer' }}
                />
              </div>

              {/* Storage Alert Note */}
              <div
                style={{
                  fontSize: '0.68rem',
                  color: '#64748b',
                  lineHeight: 1.4,
                  borderLeft: '2px solid var(--accent-warning)',
                  paddingLeft: '8px',
                }}
              >
                1.5 GB high-water safety monitor active. Dispatches tagged with bookmarks will never be deleted.
              </div>
            </div>
          </div>

          {/* Section 7: Edition Publishing & Audio Dispatch (P10-03, P10-06) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="var(--accent-primary)" />
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Publishing &amp; Audio Broadcast
              </h4>
            </div>

            <div
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* PDF Broadsheet Export Button */}
              <button
                id="btn-settings-export-pdf"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '9px 14px',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#fbbf24',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: isExportingPdf ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                <Download size={14} />
                <span>{isExportingPdf ? "Generating Broadsheet..." : "Download Today's Paper (PDF)"}</span>
              </button>

              {/* Morning Briefing Audio Button */}
              <button
                id="btn-settings-morning-briefing"
                onClick={() => {
                  setSettingsOpen(false);
                  setBriefingOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '9px 14px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                <Radio size={14} />
                <span>Play 2-Min Morning Briefing</span>
              </button>

              <div style={{ fontSize: '0.68rem', color: '#64748b', textAlign: 'center', marginTop: '2px' }}>
                Broadsheet rendered in classical 2-column layout • Voice via Web Speech API
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            background: 'rgba(10, 14, 26, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={13} />
            <span>SQLite FTS5 Local Engine</span>
          </div>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
