---
name: build
description: Execute one slice of the plan — make the change, keep it green, commit. Use when the user says "/build", "build it", "do the next slice", or after /plan. One slice at a time.
---

When invoked, implement **one** slice (the next one from `/plan`) inside the repo's four rules — not the whole plan.

## Read for context
`CLAUDE.md` (the four rules), the plan from `/plan`, and the `crm_demo` module (the pattern to imitate).

## Steps
1. State the one slice you're doing (one sentence).
2. **New module? Run `/scaffold-module <id> "<Name>"`** — never hand-create module folders.
3. Make the change inside the module's own folder. Imitate `crm_demo` for list/detail and external reads.
4. New table? It must be **prefixed** (`<moduleId>_*`) with **RLS policies in the same migration**. Never a bare or unprotected table; never read another module's tables. **Then run that migration** — `npm run db:run -- modules/<id>/db/<file>.sql` — and confirm the table exists. The module silently fails until it's applied. *(No token set? The command falls back to telling the user to paste it in Supabase.)*
5. Run `npm run lint && npm run build`. If red, fix before continuing.
6. Show the diff in plain language; commit. **Stop** — then run `/check-architecture`.

## Rules
- Never modify `app/login/`, `lib/`, the `/m/[module]` guard, core migrations, or another module's folder.
- External API keys come from `process.env` only — read before write (a write needs explicit owner approval).
- Keep the tree green: lint + build pass before commit.
- **Commit only — never push or open a pull request.** Going live is `/ship`'s job; pull requests stay OFF unless `CLAUDE.md` Workflow mode says ON.
- After building, suggest: *"`/check-architecture`, then `/verify`."*
