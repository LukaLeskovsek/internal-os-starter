---
name: build
description: Execute one slice of the plan — build the person's flow first, then the storage it needs, keep it green, commit. Use when the user says "/build", "build it", "do the next slice", or after /plan. One slice at a time. Also in Slovenian: "naredi", "gremo", "zgradi", "naslednji korak", "ja, tako".
---

When invoked, implement **one** slice (the next one from `/plan`) inside the repo's rules — not the whole plan.

## Read for context
`CLAUDE.md` (the four rules, **Design & UX rules**, module contract, action pattern), the Feature Card `docs/features/<moduleId>/feature.md`, `docs/ux-patterns.md`, and the **reference module for the Card's pattern** (`travel_orders` quick entry, `invoice_ocr` review queue, `work_orders` dispatch, `crm_demo` lookup, `ai_assist` ask). Imitate that module's structure: `pages.tsx` (server, loads data), small client components for sheets and rows, `actions.ts`, `strings.ts`, `summary.ts`.

## Clarify what is missing
Read the accepted plan and CLAUDE.md profile guidance. Reuse agreed decisions. Ask one question only when a missing decision changes this slice. State the slice before building; an explicit request to implement the agreed plan is sufficient authorization for that work. External actions still follow the plan's permissions.

## Steps
1. State the one slice you're doing (one sentence, from the person's side: "Terenec zaključi nalog z enim dotikom").
2. **New module? Run `/scaffold-module`** — never hand-create module folders.
3. **Build the flow first**, in the module's own folder:
   - The primary action opens a `FormSheet` (also on `?nov=1`, shortcut N). Prefill and default everything the Card says.
   - Lists are `DataList`/`ListRow` with the next step as a row button; `EmptyState` offers the primary action.
   - Actions start with `moduleContext("<id>")`, return `ActionResult`, call `revalidatePath`. No `redirect()` for feedback.
   - Copy goes in `strings.ts` (Slovenian); dates/money/plurals through `lib/format.ts`.
4. **Then the storage the flow needs.** New table? It must be **prefixed** (`<moduleId>_*`) with **RLS policies in the same migration**. Never read another module's tables. **Run the migration** — apply it through the **Supabase MCP** (`apply_migration`, name `<id>_<file without .sql>`, query = the file) when it is connected; otherwise `npm run db:run -- modules/<id>/db/<file>.sql` (needs `SUPABASE_ACCESS_TOKEN`) — and confirm the table exists. *(Neither available? `/nastavitev` connects the Supabase MCP.)*
5. Keep `summary.ts` (Home tile line) and the registry `primaryAction` in step with the Card.
6. Run `npx tsc --noEmit && npm run lint`. If red, fix before continuing. Run `npm run build` only if `npm run dev` is not running.
7. Show the change in plain language (what the person can now do, in how many clicks); commit.
8. **Record it.** Append `docs/features/<moduleId>/runs/<YYYY-MM-DD-HHMM>-build.md` (the slice, files changed, commit ref) and set the Card's `status: built`. **Stop** — then run `/check-architecture`.

## Rules
- Never modify `app/login/`, `lib/` security helpers, the `/m/[module]` guard, core migrations, or another module's folder. Shared UI is in `components/app/` — reuse it.
- No form permanently open above a list. No raw ISO dates. No developer words in the UI. Tokens only, never hex or `bg-blue-500`. `render={<Link/>}`, never `asChild`.
- External API keys come from `process.env` only — read before write (a write needs explicit owner approval).
- Keep the tree green before commit.
- **Commit only — never push or open a pull request.** Going live is `/ship`'s job; pull requests stay OFF unless `CLAUDE.md` Workflow mode says ON.
- After building, suggest: *"`/check-architecture`, then `/verify`."*
