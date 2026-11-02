/**
 * frontend/src/library/history/HistoryDatePicker.tsx
 * Date picker and archival filter controls for Historical News.
 */
import React from 'react';
import { Calendar, Filter, RotateCcw } from 'lucide-react';

export interface HistoryDatePickerProps {
  month: number;
  day: number;
  onDateChange: (month: number, day: number) => void;
  selectedDecade: string;
  onDecadeChange: (decade: string) => void;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  onResetToToday: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DECADE_OPTIONS = [
  { label: 'All Decades', value: 'all' },
  { label: '1850s', value: '1850' },
  { label: '1900s', value: '1900' },
  { label: '1910s (WWI)', value: '1910' },
  { label: '1920s', value: '1920' },
  { label: '1930s', value: '1930' },
  { label: '1940s (WWII / Independence)', value: '1940' },
  { label: '1950s', value: '1950' },
  { label: '1960s (Space Age)', value: '1960' },
  { label: '1970s', value: '1970' },
  { label: '1980s', value: '1980' },
  { label: '1990s', value: '1990' },
  { label: '2000s', value: '2000' },
];

const COUNTRY_OPTIONS = [
  { label: 'All Regions', value: 'all' },
  { label: 'India', value: 'India' },
  { label: 'USA', value: 'USA' },
  { label: 'China', value: 'China' },
  { label: 'Japan', value: 'Japan' },
  { label: 'Australia', value: 'Australia' },
  { label: 'United Kingdom', value: 'United Kingdom' },
  { label: 'France', value: 'France' },
  { label: 'Germany', value: 'Germany' },
  { label: 'International', value: 'International' },
];

export const HistoryDatePicker: React.FC<HistoryDatePickerProps> = ({
  month,
  day,
  onDateChange,
  selectedDecade,
  onDecadeChange,
  selectedCountry,
  onCountryChange,
  onResetToToday,
}) => {
  const daysInMonth = new Date(2024, month, 0).getDate(); // leap-year friendly
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Calendar Header Card */}
      <div className="p-4 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)] shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[var(--lib-accent)]">
            <Calendar className="w-4 h-4" />
            <span className="lib-meta text-[11px] font-medium tracking-wider">CALENDAR ARCHIVE</span>
          </div>
          <button
            type="button"
            onClick={onResetToToday}
            className="flex items-center gap-1 text-[11px] font-serif text-[var(--lib-ink-muted)] hover:text-[var(--lib-accent)] transition-colors"
            title="Reset to today's date"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Today</span>
          </button>
        </div>

        {/* Month & Day Selectors */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label className="block text-[10px] uppercase font-sans tracking-wider text-[var(--lib-ink-muted)] mb-1">
              Month
            </label>
            <select
              value={month}
              onChange={(e) => onDateChange(parseInt(e.target.value, 10), Math.min(day, new Date(2024, parseInt(e.target.value, 10), 0).getDate()))}
              className="w-full px-2.5 py-1.5 text-xs font-serif rounded border border-[var(--lib-border)] bg-[var(--lib-card-bg)] text-[var(--lib-ink)] focus:outline-none focus:border-[var(--lib-accent)]"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-sans tracking-wider text-[var(--lib-ink-muted)] mb-1">
              Day
            </label>
            <select
              value={day}
              onChange={(e) => onDateChange(month, parseInt(e.target.value, 10))}
              className="w-full px-2.5 py-1.5 text-xs font-serif rounded border border-[var(--lib-border)] bg-[var(--lib-card-bg)] text-[var(--lib-ink)] focus:outline-none focus:border-[var(--lib-accent)]"
            >
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-[11px] text-[var(--lib-ink-muted)] font-serif italic mt-2.5 text-center">
          Showing dispatches on {MONTH_NAMES[month - 1]} {day} across centuries
        </p>
      </div>

      {/* Filter Matrix: Decades & Country */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[var(--lib-ink-muted)] font-serif">
          <span className="flex items-center gap-1.5 font-medium text-[var(--lib-ink)]">
            <Filter className="w-3.5 h-3.5 text-[var(--lib-gold)]" />
            <span>Archive Filters</span>
          </span>
          {(selectedDecade !== 'all' || selectedCountry !== 'all') && (
            <button
              type="button"
              onClick={() => {
                onDecadeChange('all');
                onCountryChange('all');
              }}
              className="text-[11px] text-[var(--lib-accent)] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Country Selector */}
        <div>
          <label className="block text-[10px] uppercase font-sans tracking-wider text-[var(--lib-ink-muted)] mb-1">
            Region / Jurisdiction
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-serif rounded border border-[var(--lib-border)] bg-[var(--lib-surface)] text-[var(--lib-ink)] focus:outline-none focus:border-[var(--lib-accent)]"
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Decade Chips */}
        <div>
          <label className="block text-[10px] uppercase font-sans tracking-wider text-[var(--lib-ink-muted)] mb-1.5">
            Historical Epoch / Decade
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {DECADE_OPTIONS.map((dec) => {
              const active = selectedDecade === dec.value;
              return (
                <button
                  key={dec.value}
                  type="button"
                  onClick={() => onDecadeChange(dec.value)}
                  className={`px-2.5 py-1 text-[11px] font-serif rounded transition-all duration-150 border ${
                    active
                      ? 'bg-[var(--lib-accent)] text-white border-[var(--lib-accent)] font-medium shadow-sm'
                      : 'bg-[var(--lib-surface)] text-[var(--lib-ink-muted)] border-[var(--lib-border)] hover:border-[var(--lib-ink-muted)] hover:text-[var(--lib-ink)]'
                  }`}
                >
                  {dec.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
