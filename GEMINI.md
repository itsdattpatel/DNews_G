# MANDATORY WORKFLOW FOR EVERY CODING TASK

Before writing or editing any code, you MUST:
1. State in one line what the task's FIRST deliverable is.
2. Pick the matching skills from the table below. Open and read each SKILL.md in .agent/skills/ BEFORE coding. If you did not read it, you may not claim you used it.
3. Read the relevant /docs files (UI_SPEC.md, DESIGN_SYSTEM.md, DB_SCHEMA.md, API_CONTRACT.md, AI_PROMPTS.md).
4. Reply with: "Task: ... | Skills read: ... | Docs read: ..." and then start.
5. After coding, run the app, verify it works, and use ui-visual-validator for any UI change. Show me screenshots.
6. Stop and wait for my approval before the next task.

# SKILL TABLE
- Database / SQLite / migrations -> database-architect, sql-optimization-patterns
- Backend API, scheduler, SSE, fetchers -> backend-architect, typescript-pro
- React UI, components, animation -> frontend-developer, typescript-pro, ui-visual-validator
- API keys, .env, provider fallback -> secrets-management
- Bugs and errors -> error-diagnostics-smart-debug
- Tests -> tdd-workflows-tdd-cycle
- Docs / README -> docs-architect
- Before release -> security-auditor

# FRONTEND QUALITY RULES (anti-slop)
- Before any UI work, make sure /docs/DESIGN_SYSTEM.md exists (palette, fonts, spacing, motion rules, bat art direction). If it does not, create it first and wait for my approval.
- Use only values from the design system. No default purple/blue gradients, no generic card grids, no emoji used as icons, no placeholder text, no inline styles.
- Newspaper feel: serif for article text, strong typographic hierarchy, ink-and-paper contrast.
- Bat and globe are custom SVG/Canvas drawings, not stock icons.
- Every component needs loading, empty, and error states.

# RULES
- One task at a time. Never rewrite working code unless asked.
- If unsure, ask me. Do not guess.