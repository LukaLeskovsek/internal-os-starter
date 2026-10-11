---
name: check-architecture
description: Audit the current changes against this repo's modular-monolith rules and its design & UX rules. Use when the user says "/check-architecture", after scaffolding a module, or before committing. Also in Slovenian: "preveri pravila", "je vse po pravilih?".
---

When invoked, review the working changes (run `git diff` and read the changed files) and report violations — each with the file/line and a concrete fix.

## Check: architecture
1. **Prefixes** — every new table in any `modules/*/db/*.sql` is named `<moduleId>_*`. Flag a bare table (e.g. `contacts` inside `crm_demo` instead of `crm_demo_contacts`).
2. **RLS present** — every new table enables RLS and has policies in the same migration.
3. **Access re-checked in actions** — every exported function in `modules/<id>/actions.ts` starts with `moduleContext("<id>")` (or, in `admin`, the owner check). A module action without it can be driven by a member who lacks the module.
4. **No cross-module imports** — no file under `modules/<a>/` imports from `modules/<b>/`.
5. **Summaries stay in their lane** — `modules/<id>/summary.ts` reads only `<id>_*` tables through the client it is given, never imports `lib/supabase/admin`, never calls an external API.
6. **No secrets in code** — no API keys/tokens hardcoded; secrets come from `process.env` only; nothing prefixed `NEXT_PUBLIC_` is a server secret.
7. **Registry consistency** — every `modules/<id>/` has a `_registry.ts` entry (with `icon` and `primaryAction`), a `core_modules` row, and a `case` in `app/(app)/m/[module]/page.tsx`.

## Check: design & UX rules (CLAUDE.md)
8. **No colour literals in modules** — no hex (`#…`), `rgb(`, or Tailwind palette classes (`bg-blue-500`, `text-red-600`…) under `modules/`. Use tokens.
9. **No `asChild`** — Base UI composes with `render={…}`.
10. **No raw dates or numbers** — no rendered `toISOString()`, `.toFixed(`, or `YYYY-MM-DD` strings in JSX; use `lib/format.ts`.
11. **No feedback redirects** — no `redirect("…?ok=` / `?error=` in module actions; return `ActionResult`.
12. **Slovenian copy in `strings.ts`** — no English UI strings or developer words ("RLS", "mock", env-var names, table names, skill names) in rendered text.
13. **No form permanently open above a list** — create/edit lives in a `FormSheet`.

## Output
A short report: ✓ for each rule that passes; for each failure, the exact path/line and the fix. End with **PASS** or a numbered list of must-fixes. Do not edit files unless the user asks.

## Rules
- Be specific — cite path and line. Don't invent violations; if a rule passes, say so plainly.
- Quick greps help: `grep -rnE "#[0-9a-fA-F]{3,6}\b|bg-(red|blue|green|gray|slate)-[0-9]" modules/`, `grep -rn asChild modules/`, `grep -rn "?ok=\|?error=" modules/`.
