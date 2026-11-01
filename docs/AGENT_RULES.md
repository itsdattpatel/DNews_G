# Agent Rules — AI World News Desk
*Version 1.0 · 2026-10-30*

These rules govern how the coding agent (me) must behave throughout this project.
They are binding and take precedence over any general AI assistant defaults.

---

## 1. Documentation-First Rule

- **NEVER write implementation code before all Phase docs are approved.**
- For each subsequent phase, show the full task list for that phase and wait for "go" before starting.
- After completing a phase, stop and present a summary; do not begin the next phase without explicit user approval.

---

## 2. Secrets & Security

- API keys, tokens, passwords **never** appear in any `.ts`, `.js`, `.tsx`, `.json`, or `.yaml` file.
- They live **only** in `.env` (listed in `.gitignore`).
- `.env.example` is committed with placeholder values (e.g., `GEMINI_API_KEY=your_key_here`).
- Before finalising any file, agent must grep for common secret patterns (`sk-`, `AIza`, `Bearer `) and fail if found.
- Server **must** bind to `127.0.0.1`, never `0.0.0.0`.

---

## 3. Modular Architecture

- Every feature must have:
  1. A corresponding boolean in `config/features.ts`
  2. A check at the top of its module: `if (!FEATURES.feature_name) return`
  3. Its own file in the appropriate sub-directory
- No file may exceed 400 lines. Refactor into sub-modules if needed.
- No circular imports. If detected by `eslint-plugin-import/no-cycle`, fix before commit.

---

## 4. TypeScript Rules

- `strict: true` in all `tsconfig.json` files.
- No `any` type allowed (use `unknown` + type guard if truly dynamic).
- All exported functions must have explicit return types.
- Interfaces for all data shapes that cross module boundaries.
- Run `tsc --noEmit` before each phase completion; zero errors required.

---

## 5. Verify Before Adding

- **RSS / feed URLs**: agent must perform a live HTTP GET test and confirm HTTP 200 + valid XML before adding a source to `config/sources.ts`. Dead URLs are replaced, not listed with a TODO.
- **npm packages**: check npm weekly download count and last-publish date. Do not add packages with < 10k downloads/week or last published > 2 years ago without asking the user.
- **AI provider endpoints**: confirm API is reachable before adding an adapter.

---

## 6. AI Layer Rules

- The AI is **exclusively** used to fill the fixed JSON schema defined in `AI_PROMPTS.md`.
- The AI **must never generate code**, shell commands, or HTML as part of a news-processing response.
- All AI responses must be validated against the schema (Zod) before storing to DB.
- If validation fails, mark article `ai_failed`; never store malformed data.
- Batch requests only (no per-article API calls).

---

## 7. Database Rules

- All schema changes go through numbered migration files (`backend/src/db/migrations/`).
- Never run `ALTER TABLE` without a migration file.
- Use `better-sqlite3` synchronous API; no async DB calls.
- All queries that accept user input must use parameterised statements. No string interpolation in SQL.
- FTS5 triggers must be kept in sync whenever `articles` schema changes.

---

## 8. Frontend Rules

- No inline styles (use CSS custom properties and classes only).
- No TailwindCSS (Vanilla CSS per stack spec).
- All lists of > 50 items must use virtualisation (react-window or equivalent).
- Canvas animation must be in its own `canvas/` module, not mixed into component files.
- Every component with significant logic has a unit test.
- Components must have `data-testid` attributes for Playwright selectors.

---

## 9. Error Handling

- Every fetch call is wrapped in try/catch with a typed error result.
- Network errors are logged to console + stored in a `error_log` (can be a simple append to a `.log` file).
- The UI must never show a raw JavaScript stack trace to the user.
- Provider fallback must be transparent to the end user only via the alert banner and provider badge — never a crash.

---

## 10. Commit Hygiene

- One logical change per commit (even though this is a local project).
- Commit message format: `phase(N): short description` e.g. `phase(1): add RSS fetcher and dedup`
- Run `npm test` before each commit; failing tests block the commit (pre-commit hook).
- `docs/` changes committed separately from code changes.

---

## 11. Communication Rules

- If a requirement is **ambiguous**, the agent must ask one targeted clarifying question and wait.
- The agent must not assume answers to the Open Questions in `PRD.md §10`.
- After each phase, the agent posts: phase summary, list of what was built, list of acceptance criteria passed, and any new open questions discovered.
- The agent states clearly if a task was skipped or deferred and why.

---

## 12. Performance Rules

- Every backend endpoint must respond in < 500 ms under normal load (single user, local SQLite).
- Frontend must not block the main thread for > 50 ms. Expensive operations (TF-IDF, FTS) happen server-side.
- Canvas rAF loop must drop spiders before dropping frames — FPS >= 30 is non-negotiable.
- Bundle size target: < 500 KB gzipped (excluding hls.js and map libraries).

---

## 13. What the Agent Will NOT Do

- Generate production build (only dev server) unless user explicitly requests it.
- Touch files outside the project workspace.
- Auto-start the browser or open URLs automatically (describe how to do it instead).
- Make outbound network requests during tests (mock all external HTTP).
- Accept a phase as complete if any test in the TEST_PLAN for that phase is failing.
