# Test Plan — AI World News Desk
*Version 1.0 · 2026-10-30*

---

## 1. Testing Philosophy

- **No cloud/CI required** — all tests run locally with `npm test`
- Unit tests: Vitest (fast, ESM-native)
- Integration tests: Supertest against a real SQLite in-memory DB
- E2E tests: Playwright (headless Chromium) for critical user flows
- Manual tests: documented scripts for animation and provider fallback
- Coverage target: 80% line coverage on backend; 60% on frontend logic
- Tests run automatically at the end of every phase before the review stop

---

## 2. Test Structure

```
DNews_G/
├── backend/
│   └── src/
│       └── __tests__/
│           ├── unit/
│           │   ├── rss.test.ts
│           │   ├── dedup.test.ts
│           │   ├── cluster.test.ts
│           │   ├── ai-router.test.ts
│           │   ├── quota.test.ts
│           │   └── alerts.test.ts
│           └── integration/
│               ├── articles.api.test.ts
│               ├── search.api.test.ts
│               └── sse.api.test.ts
├── frontend/
│   └── src/
│       └── __tests__/
│           ├── unit/
│           │   ├── ik.test.ts
│           │   ├── useArticles.test.tsx
│           │   └── typewriter.test.ts
│           └── e2e/               ← Playwright
│               ├── main-flow.spec.ts
│               ├── settings.spec.ts
│               └── tv-view.spec.ts
```

---

## 3. Phase-by-Phase Test Cases

### Phase 1 — Backend Core

| ID | Type | Description | Pass Condition |
|----|------|-------------|----------------|
| T1-01 | Unit | `rss.ts` parses fixture RSS XML | Returns >= 1 ArticleRaw with title, url, body |
| T1-02 | Unit | `dedup.ts` skips already-known URL | Second insert returns `skipped`; DB count = 1 |
| T1-03 | Unit | `ai/router.ts` falls back on 429 | Mock provider 1 returns 429; provider 2 called |
| T1-04 | Unit | `ai/router.ts` falls back on timeout | Mock provider 1 times out after 20 s; provider 2 called |
| T1-05 | Unit | `quota.ts` increments counter on each call | Count matches number of mock calls |
| T1-06 | Integration | GET /api/articles returns 200 with items array | Status 200; body has `total` and `items` |
| T1-07 | Integration | GET /api/sse sends heartbeat | EventSource receives heartbeat within 35 s |
| T1-08 | Integration | PATCH /api/settings validates range | `refresh_interval_minutes: 0` returns 400 |
| T1-09 | Manual | No API key in any .ts file | `grep -r "sk-" backend/src` returns nothing |

---

### Phase 2 — Countries & Categories

| ID | Type | Description | Pass Condition |
|----|------|-------------|----------------|
| T2-01 | Manual | Live-test each RSS URL | All 24 return HTTP 200 and valid XML |
| T2-02 | Integration | Article from India source has country="India" | DB query returns correct source.country |
| T2-03 | Integration | AI response inserts to article_categories | SELECT from article_categories where article_id = X returns rows |
| T2-04 | Unit | `cluster.ts` groups two near-identical summaries | cosine > 0.85 → same cluster_id |
| T2-05 | Unit | `cluster.ts` keeps distinct summaries separate | cosine < 0.85 → different cluster_id |
| T2-06 | Integration | GET /api/articles?category=Animals returns only animal articles | All items have category Animals |
| T2-07 | Integration | GET /api/articles?country=Japan returns only JP sources | All items source.country === Japan |

---

### Phase 3 — Main Screen

| ID | Type | Description | Pass Condition |
|----|------|-------------|----------------|
| T3-01 | E2E | App loads; card strip shows >= 1 card | Playwright: `data-testid=card-strip` has children |
| T3-02 | E2E | Clicking a card loads article in left panel | Left panel shows article title within 1 s |
| T3-03 | E2E | Category pill "Animals" filters card strip | All visible cards have Animals category badge |
| T3-04 | E2E | Bat icon opens settings drawer | Drawer visible after click; has "Refresh Interval" slider |
| T3-05 | E2E | SSE new_article event adds card without reload | New card appears without page navigation |
| T3-06 | Manual | Dark theme renders correctly | No white flash; all text passes colour contrast |

---

### Phase 4 — Spider Animation

| ID | Type | Description | Pass Condition |
|----|------|-------------|----------------|
| T4-01 | Unit | `ik.ts` FABRIK solver: target within reach | Foot position within 1 px of target |
| T4-02 | Unit | `ik.ts` FABRIK solver: target out of reach | Foot at max extension; no NaN |
| T4-03 | Unit | `ik.ts` Lerp convergence | After 20 frames at dt=16ms, foot within 2 px of target |
| T4-04 | Manual | Reader spider walks 5 keywords | No leg stretching beyond 38 px |
| T4-05 | Manual | FPS stays >= 30 with 6 spiders | Ctrl+F overlay shows >= 30 FPS |
| T4-06 | Manual | prefers-reduced-motion disables animation | Static summary shown; no canvas drawing |

---

### Phase 5 — Scheduler & Resume

| ID | Type | Description | Pass Condition |
|----|------|-------------|----------------|
| T5-01 | Integration | Startup with 2 h gap detected correctly | GET /api/startup-status returns missed_minutes ~120 |
| T5-02 | Integration | GDELT backfill fetches articles for gap | Articles with published_at in gap appear in DB |
| T5-03 | Manual | Auto-start scripts are valid (Windows) | Task Scheduler shows new entry after running setup script |
| T5-04 | E2E | "Show missed news?" modal appears on startup with gap | Modal with "Yes / Skip" visible |

---

### Phase 6 — Alerts & Quota

| ID | Type | Description | Pass Condition |
|----|------|-------------|----------------|
| T6-01 | Unit | `alerts/detector.ts` fires on breaking_score >= 75 | SSE event `alert` emitted |
| T6-02 | Unit | Cluster rule: 3 outlets, 2 countries, 30 min window | `alert` emitted |
| T6-03 | Unit | Cluster rule: 2 outlets only → no alert | No alert emitted |
| T6-04 | Integration | Alert inserted to DB | GET /api/alerts returns the alert |
| T6-05 | E2E | Alert banner slides in within 10 s of insert | Banner element visible; class `visible` added |
| T6-06 | E2E | Quota meter bars update after AI call | Bar width changes within 5 s of call |
| T6-07 | E2E | Provider-switch banner shows amber colour | Banner has amber left border on provider_switch SSE |

---

### Phase 7 — Clustering & Compare

| ID | Type | Description | Pass Condition |
|----|------|-------------|----------------|
| T7-01 | Integration | GET /api/clusters/:id returns all member articles | items[] has correct article_ids |
| T7-02 | E2E | Compare Coverage screen shows 2 columns for 2-outlet cluster | Two country columns visible |
| T7-03 | Manual | Shared keyword same colour across columns | Visual check: keyword "flood" same highlight colour |
| T7-04 | Manual | Weaver spider draws thread between shared keyword chips | Thread line visible on canvas |
| T7-05 | E2E | Story timeline shows events in order | Published_at timestamps ascending |

---

### Phase 8 — Watchlist & Archive Chat

| ID | Type | Description | Pass Condition |
|----|------|-------------|----------------|
| T8-01 | Integration | POST /api/watchlist creates entry | 201; returned id in DB |
| T8-02 | Integration | Watchlist match fires SSE alert | Article with "bear bile" in keywords triggers alert |
| T8-03 | Integration | POST /api/search?q=flood returns FTS results | items[] has articles with "flood" in text |
| T8-04 | Integration | POST /api/search use_ai=true returns ai_answer | ai_answer is non-empty string |
| T8-05 | Integration | Cleanup deletes articles > 30 days (not bookmarked) | Count reduces; bookmarked article remains |
| T8-06 | E2E | Archive chat input returns answer panel | Answer panel visible within 10 s |

---

### Phase 9 — Globe

| ID | Type | Description | Pass Condition |
|----|------|-------------|----------------|
| T9-01 | E2E | Globe view renders world map | SVG or canvas element present; no console errors |
| T9-02 | E2E | Clicking India on map filters feed | Feed shows only India articles |
| T9-03 | Manual | Animal crime overlay shows red region | Red shading visible over countries with animal articles |

---

### Phase 10 — PDF & Read-Aloud

| ID | Type | Description | Pass Condition |
|----|------|-------------|----------------|
| T10-01 | Integration | POST /api/export/pdf returns PDF binary | Content-Type: application/pdf; body.length > 0 |
| T10-02 | Integration | GET /api/export/briefing returns text < 400 words | word count <= 400 |
| T10-03 | E2E | Morning briefing button triggers speech | SpeechSynthesis.speak called (spy on window API) |

---

### Phase 11 — TV View

| ID | Type | Description | Pass Condition |
|----|------|-------------|----------------|
| T11-01 | Integration | GET /api/tv/channels returns channels | items[] non-empty |
| T11-02 | Integration | POST /api/tv/channels/:id/health-check returns is_alive | Boolean field present |
| T11-03 | E2E | TV view renders channel list | List items visible |
| T11-04 | E2E | Favorite toggle works | Star filled after click; channel moves to Favorites section |
| T11-05 | Manual | hls.js plays a live stream | Video plays; no fatal HLS errors in console |

---

### Phase 12 — Polish & Final

| ID | Type | Description | Pass Condition |
|----|------|-------------|----------------|
| T12-01 | E2E | Full flow: open app, read article, dismiss alert, open settings, close | No errors |
| T12-02 | Manual | All 6 spider types render | Each spider visually identifiable |
| T12-03 | Perf | Lighthouse performance score | >= 80 on localhost |
| T12-04 | Manual | No API keys in git history | `git log -p | grep "sk-"` returns nothing |
| T12-05 | Manual | README: follow instructions on fresh machine | App runs first time following README only |

---

## 4. Test Commands

```bash
# Unit + integration
npm test                          # runs Vitest in all workspaces

# Watch mode
npm test -- --watch

# E2E
npx playwright test               # runs all Playwright specs
npx playwright test --ui          # interactive mode

# Coverage report
npm test -- --coverage
```

---

## 5. Test Fixtures

- `backend/src/__tests__/fixtures/sample-rss.xml` — valid RSS feed with 3 articles
- `backend/src/__tests__/fixtures/ai-response.json` — valid AI batch response
- `backend/src/__tests__/fixtures/gdelt-response.json` — valid GDELT API response
- `frontend/src/__tests__/fixtures/articles.json` — 10 mock articles
