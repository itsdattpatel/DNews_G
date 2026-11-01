/**
 * frontend/src/components/layout/TopBar.tsx
 * Top navigation bar with Bat icon, category pills, country filter, search, and provider status.
 */
import React from 'react';
import { BatIcon } from '../bat/BatIcon';
import { ProviderBadge } from '../quota/ProviderBadge';
import { useAppStore } from '../../store/useAppStore';
import { Search, Flame, Settings, X, Clock, Archive, Globe, Radio, Tv } from 'lucide-react';
import { FEATURES } from '../../config/features';

const CATEGORIES = [
  'All',
  'World',
  'Politics',
  'Business',
  'Tech',
  'Science',
  'Health',
  'Environment',
  'Animals',
  'Crime',
];

const COUNTRIES = [
  { label: 'All Countries', value: null },
  { label: 'India 🇮🇳', value: 'India' },
  { label: 'USA 🇺🇸', value: 'USA' },
  { label: 'China 🇨🇳', value: 'China' },
  { label: 'Japan 🇯🇵', value: 'Japan' },
  { label: 'Australia 🇦🇺', value: 'Australia' },
  { label: 'Wildlife 🐾', value: 'Animals' },
];

export const TopBar: React.FC = () => {
  const selectedCategory = useAppStore((s) => s.selectedCategory);
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory);
  const selectedCountry = useAppStore((s) => s.selectedCountry);
  const setSelectedCountry = useAppStore((s) => s.setSelectedCountry);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const isBreakingOnly = useAppStore((s) => s.isBreakingOnly);
  const toggleBreakingOnly = useAppStore((s) => s.toggleBreakingOnly);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const setArchiveChatOpen = useAppStore((s) => s.setArchiveChatOpen);
  const setGlobeOpen = useAppStore((s) => s.setGlobeOpen);
  const setBriefingOpen = useAppStore((s) => s.setBriefingOpen);
  const setTvViewOpen = useAppStore((s) => s.setTvViewOpen);
  const startupStatus = useAppStore((s) => s.startupStatus);
  const setMissedNewsModalOpen = useAppStore((s) => s.setMissedNewsModalOpen);

  return (
    <header
      id="top-bar"
      style={{
        height: '56px',
        minHeight: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        zIndex: 40,
        gap: '12px',
      }}
    >
      {/* Left: Bat + Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <BatIcon size={34} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #f8fafc 40%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.1,
            }}
          >
            AI NEWS DESK
          </span>
          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.08em' }}>
            GLOBAL RADAR
          </span>
        </div>
      </div>

      {/* Middle: Category Pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          padding: '2px 0',
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat === 'All' ? selectedCategory === null : selectedCategory === cat;
          return (
            <button
              key={cat}
              id={`cat-pill-${cat.toLowerCase()}`}
              onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
              style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: isActive ? 600 : 500,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                background: isActive ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.6)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 0 12px rgba(99, 102, 241, 0.35)' : 'none',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Right Controls: Country, Breaking Toggle, Search, Provider, Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* Country Selector */}
        <select
          id="country-filter-select"
          value={selectedCountry ?? ''}
          onChange={(e) => setSelectedCountry(e.target.value || null)}
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '0.78rem',
            padding: '4px 8px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {COUNTRIES.map((c) => (
            <option key={c.label} value={c.value ?? ''} style={{ background: '#111827', color: '#f8fafc' }}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Breaking Only Filter Toggle */}
        <button
          id="breaking-filter-toggle"
          onClick={toggleBreakingOnly}
          title="Toggle Breaking News Only"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            borderRadius: '8px',
            border: isBreakingOnly ? '1px solid rgba(239, 68, 68, 0.8)' : '1px solid var(--border)',
            background: isBreakingOnly ? 'rgba(239, 68, 68, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            color: isBreakingOnly ? '#ef4444' : 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          <Flame size={14} color={isBreakingOnly ? '#ef4444' : '#64748b'} />
          <span>Breaking</span>
        </button>

        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            background: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            padding: '2px 8px',
            width: '160px',
          }}
        >
          <Search size={14} color="#64748b" style={{ marginRight: '6px' }} />
          <input
            id="article-search-input"
            type="text"
            placeholder="Search news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
            >
              <X size={12} color="#94a3b8" />
            </button>
          )}
        </div>

        {/* Startup Gap Status Badge (P5-09) */}
        {startupStatus?.detected && startupStatus.missed_minutes > 0 && (
          <button
            id="btn-gap-status-badge"
            onClick={() => setMissedNewsModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: 'var(--accent-warning)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s ease',
            }}
            title={`Offline for ${startupStatus.missed_minutes}m — Click to open Catch-Up Dispatches`}
          >
            <Clock size={12} color="var(--accent-warning)" />
            <span>Gap: {startupStatus.missed_minutes}m</span>
          </button>
        )}

        {/* Provider Badge */}
        <ProviderBadge />

        {/* Archive Morgue Chat Button (P8-03, P8-05) */}
        <button
          id="btn-archive-chat-open"
          onClick={() => setArchiveChatOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Historical Archive Intelligence & Morgue Chat (FTS5 + AI)"
        >
          <Archive size={14} color="#f59e0b" />
          <span>Morgue</span>
        </button>

        {/* Globe / Map View Button (P9-07) */}
        {FEATURES.globe_view && (
          <button
            id="btn-globe-toggle"
            onClick={() => setGlobeOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#818cf8',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Global News Radar & Wildlife Intelligence Map"
          >
            <Globe size={14} color="#818cf8" />
            <span>Globe</span>
          </button>
        )}

        {/* Morning Briefing Radio Button (P10-06, P10-08) */}
        {FEATURES.morning_briefing && (
          <button
            id="btn-briefing-toggle"
            onClick={() => setBriefingOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="2-Minute Executive Morning Radio Briefing"
          >
            <Radio size={14} color="#ef4444" />
            <span>Briefing</span>
          </button>
        )}

        {/* Live TV & IPTV View Button (P11-06) */}
        {FEATURES.tv_view && (
          <button
            id="btn-tv-view-toggle"
            onClick={() => setTvViewOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Live IPTV Broadcast Feeds & Wildlife Television"
          >
            <Tv size={14} color="#38bdf8" />
            <span>TV</span>
          </button>
        )}

        {/* Settings Button */}
        <button
          id="settings-gear-button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open Settings Drawer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '8px',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          title="Open Settings Drawer"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
