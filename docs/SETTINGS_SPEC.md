# Unified Settings Specification — PRD C
*Version 1.0 · 2026-11-03 · AI World News Desk*

---

## 1. Architectural Overview

The settings architecture consolidates all application preferences, toggles, intervals, and data controls into a unified, focus-trapped dialog.
Accessible from the bottom of the Right Icon Rail (and via global shortcut `,`), the dialog replaces the Bat Menu settings drawer and scattered modals.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  DESK SETTINGS & PREFERENCES                                                                       [✕] │
├──────────────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│  [🔍 Search settings...]            │  READING DESK PREFERENCES                                       │
│                                      │                                                                 │
│  • General                           │  Auto-Advance Ambient Reading                                   │
│  • Reading                           │  [ Toggle: ON ] Automatically cycle through dispatches         │
│  • News and Sources                  │                                                                 │
│  • AI and Plain mode                 │  Cycle Interval (Seconds)                                       │
│  • TV Broadcasts                     │  [ ━━━●━━━━━━━━━━━━ ] 7 seconds (3s to 60s)                      │
│  • Map & Globe                       │                                                                 │
│  • Alerts & Audio                    │  Pause on Reader Hover                                          │
│  • Appearance & Typography           │  [ Toggle: ON ] Suspends timer while reading active article     │
│  • Data, Backups & Storage           │                                                                 │
│  • Library Archives                  │  Follow Current Story in Strip                                  │
│  • Advanced & Developer              │  [ Toggle: ON ] Smoothly centers the active card in wire strip  │
│                                      │                                                                 │
│  ──────────────────────────────────  │  Ticker Scroll Speed                                            │
│  [ Reset Section to Defaults ]       │  [ Normal ▾ ] Speed of breaking news footer ticker             │
│                                      │                                                                 │
│                                      │  ─────────────────────────────────────────────────────────────  │
│                                      │  ✓ Saved to local desk configuration                            │
└──────────────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

---

## 2. Inventory of Settings & Section Mapping

All existing settings keys stored in SQLite `settings` table are preserved with zero loss or disruption.
New keys required for PRD C are specified below.

| Section | Setting Item | Stored Key | Type | Default | Constraints | Previous Home | Action / Notes |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **1. General** | System Timezone Display | `timezone_mode` | `str` | `"local"` | `"local"` \| `"utc"` | SettingsDrawer | Migrated to General section |
| **1. General** | Startup Catch-up Window | `catchup_alert_enabled` | `bool` | `1` | `0` \| `1` | Modal / Implicit | Configures WelcomeBack alert |
| **2. Reading** | Auto-Advance Enabled | `auto_advance_enabled` | `bool` | `0` | `0` \| `1` | TopBar / SettingsDrawer | Synchronized with status strip |
| **2. Reading** | Auto-Advance Interval | `auto_advance_interval_sec`| `int`| `7` | 3 to 60 | SettingsDrawer | Slider with real-time preview |
| **2. Reading** | Pause on Article Hover | `auto_advance_pause_on_hover`| `bool`| `1` | `0` \| `1` | SettingsDrawer | Standard PRD A behavior |
| **2. Reading** | Follow Current Story in Strip | `strip_follow_enabled` | `bool` | `1` | `0` \| `1` | **NEW (PRD C)** | Controls auto-scroll in CardStrip |
| **2. Reading** | Ticker Scroll Speed | `ticker_speed` | `str` | `"normal"` | `"slow"`\|`"normal"`\|`"fast"`| SettingsDrawer | Controls CSS animation duration |
| **2. Reading** | Evidence Highlighting | `evidence_highlight_enabled`| `bool`| `1` | `0` \| `1` | SettingsDrawer | Toggles anchor highlight pens |
| **2. Reading** | Reading Mode Layout | `reading_mode_enabled` | `bool` | `1` | `0` \| `1` | SettingsDrawer | Controls dual-pane split ratio |
| **3. News & Sources**| Fetch Refresh Interval | `refresh_interval_minutes` | `int` | `15` | 1 to 60 | SettingsDrawer | Reschedules fetch cron |
| **3. News & Sources**| Enabled Countries Filter| `default_country_filter` | `str` | `""` | Country slug | TopBar Dropdown | Sets startup country focus |
| **3. News & Sources**| Enabled Categories | `category_filter_list` | `str` | `"all"` | JSON array string | TopBar Category Rail| Configures active categories |
| **3. News & Sources**| Two-Pass AI Triage Threshold | `pass2_threshold` | `int` | `75` | 50 to 100 | SettingsDrawer | Triggers Pass 2 summarization |
| **4. AI & Plain** | Plain Mode (Zero AI) | `plain_mode_enabled` | `bool` | `0` | `0` \| `1` | TopBar / SettingsDrawer | Disables LLM calls entirely |
| **4. AI & Plain** | Two-Pass AI Ingestion | `two_pass_ai_enabled` | `bool` | `1` | `0` \| `1` | SettingsDrawer | Enables Pass 1 triage scoring |
| **4. AI & Plain** | Catch-Up Batch Size | `enrich_batch_size` | `int` | `20` | 5 to 50 | Backend route | Batch size for unsummarized news |
| **5. TV** | Preferred Playback Method Order | `tv_method_order` | `str` | `"youtube,hls,vlc"`| Comma-separated | **NEW (PRD C)** | Dictates fallback sequence |
| **5. TV** | Start Autoplay Muted | `tv_autoplay_muted` | `bool` | `1` | `0` \| `1` | **NEW (PRD C)** | Compliance with browser audio |
| **5. TV** | Remembered Audio Volume | `tv_volume` | `float` | `0.8` | 0.0 to 1.0 | Component state | Persisted across app sessions |
| **5. TV** | Stream Health Check Interval | `tv_health_interval_min`| `int` | `30` | 5 to 180 | Backend default | Frequency of stream probes |
| **5. TV** | Stopped Links Threshold (Fails) | `tv_stopped_fail_threshold`| `int`| `5` | 2 to 20 | Backend default | Failures before auto-stopped |
| **5. TV** | TV Floating Mini-Player | `tv_mini_player_enabled`| `bool` | `0` | `0` \| `1` | **NEW (PRD C S4)** | Draggable PiP on desk change |
| **6. Map & Globe** | Cartographic Engine | `map_engine` | `str` | `"globe"` | `"globe"` \| `"flat"` | **NEW (PRD C)** | 3D Globe vs 2D SimpleMap |
| **6. Map & Globe** | Globe Auto-Rotation | `globe_autorotate` | `bool` | `1` | `0` \| `1` | **NEW (PRD C)** | Slow ambient rotation |
| **6. Map & Globe** | Wildlife Overlay Layer | `map_wildlife_layer` | `bool` | `1` | `0` \| `1` | Map Overlay toggle | Crimson marker visualization |
| **6. Map & Globe** | Story Pulse Rings | `map_pulse_enabled` | `bool` | `1` | `0` \| `1` | **NEW (PRD C)** | Rings on new arrivals (<5m) |
| **7. Alerts** | Breaking Alert Score Threshold | `alert_threshold` | `int` | `75` | 0 to 100 | SettingsDrawer | Threshold for crimson alert banner |
| **7. Alerts** | Audio Chime on Breaking | `sound_enabled` | `bool` | `0` | `0` \| `1` | SettingsDrawer | Broadsheet acoustic chime |
| **7. Alerts** | Browser Notification Permission | `browser_notifications`| `bool` | `0` | `0` \| `1` | Component state | Web Notification API trigger |
| **8. Appearance** | Broadsheet Edition Theme | `theme` | `str` | `"paper"` | `"paper"` \| `"night"` | TopBar / BatMenu | Paper vs Night Edition tokens |
| **8. Appearance** | Layout Density | `layout_density` | `str` | `"comfortable"`| `"compact"`\|`"comfortable"`| **NEW (PRD C)** | Controls padding and typography |
| **8. Appearance** | Reduce Motion Preference | `reduce_motion_override`| `str` | `"system"` | `"system"`\|`"reduce"`\|`"allow"`| **NEW (PRD C)** | Disables rotation & smooth scroll |
| **9. Data & Backup**| Auto-Cleanup Database | `auto_cleanup_enabled` | `bool` | `0` | `0` \| `1` | SettingsDrawer | Purges unbookmarked old items |
| **9. Data & Backup**| Retention Period (Days) | `retention_days` | `int` | `30` | 7 to 365 | SettingsDrawer | Age threshold for auto-cleanup |
| **9. Data & Backup**| Manual Database Backup | `action:backup` | `action`| — | Trigger endpoint | SettingsDrawer | Generates pre-action snapshot |
| **9. Data & Backup**| Restore Backup Snapshot | `action:restore` | `action`| — | Double-confirm modal | SettingsDrawer | Restores with pre-restore safety |
| **9. Data & Backup**| Settings JSON Export | `action:export` | `action`| — | Strips API keys | SettingsDrawer | Schema v1 sanitized export |
| **9. Data & Backup**| Settings JSON Import | `action:import` | `action`| — | Validates schema | SettingsDrawer | Overwrites non-secret keys |
| **10. Library** | Default Citation Style | `library_citation_format`| `str` | `"apa"` | `"apa"` \| `"chicago"` | Library Subpages | Pre-selects copy citation format |
| **10. Library** | International Helpline Region | `helpline_default_region`| `str` | `"all"` | Country code | Library Mind Helps | Filters crisis hotline directory |
| **11. Advanced** | Debug Log Verbosity | `debug_logging` | `bool` | `0` | `0` \| `1` | Backend env | Emits detailed trace logs |
| **11. Advanced** | Clock Skew Compensation | `clock_sync_enabled` | `bool` | `1` | `0` \| `1` | Realtime Foundation | Syncs against `/api/time` |

---

## 3. Behavioral Requirements & Interaction Details

### 3.1 Autosave with Non-Blocking Confirmation
- Changes made to toggles, sliders, or select inputs invoke `PATCH /api/settings` debounced at 300ms.
- A discrete confirmation indicator displays `✓ Saved` in the footer of the active section for 2.5 seconds.
- No modal reload or screen flashing occurs during save.

### 3.2 Per-Section "Reset to Defaults"
- Every section contains a dedicated `Reset Section to Defaults` button at the bottom.
- Clicking resets only the settings belonging to that specific category back to factory defaults after a single broadsheet confirmation alert.

### 3.3 Restart-Required Notifications
- Settings that require a server scheduler or network socket reload (such as `refresh_interval_minutes` or `debug_logging`) display a subtle ink stamp:
  `[RESTART REQUIRED FOR SCHEDULER]`
- The backend gracefully refreshes active crons without dropping active database locks.

### 3.4 Secret Redaction & Sanitization
- API keys (e.g. `GEMINI_API_KEY`, `GROQ_API_KEY`, `YOUTUBE_API_KEY`) remain strictly masked (`••••••••••••`).
- Keys are never transmitted in `/api/settings/export` payloads.
- JSON import operations strictly reject unknown or secret keys to prevent privilege escalation or state corruption.

