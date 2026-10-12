---
name: scaffold-module
description: Create a new tool-module in this internal-OS repo from the job-first template. Use when the user says "/scaffold-module", "add a module", "new module", or names a tool they want behind the app's single sign-in. Also in Slovenian: "novo orodje", "nov modul", "dodaj orodje za…".
---

When invoked, create a new module the rails-compliant way. Never hand-create module folders — this skill is the path of least resistance so a clean modular monolith stays clean, and every new tool starts as a **tool for a person**, not as a table editor.

## Ask first (don't invent; reuse the Feature Card / `/plan` answers if they exist)
1. The module **id** — lowercase, snake_case. It becomes the database table prefix, e.g. `invoices`.
2. The **display name** in Slovenian, e.g. "Računi".
3. The **job sentence** — who, when, what done looks like ("Računovodkinja enkrat na teden potrdi prejete račune za plačilo"). This becomes the registry `description` (shortened) and the Card's *Job & moment*.
4. The **primary action** label, e.g. "Naloži račune".
5. The **pattern** from `docs/ux-patterns.md` — Hitri vnos (default), Pregledna vrsta, Dodeljevanje, Iskanje, Vprašaj.
6. Suggest **three lucide icons** (lucide.dev/icons) that fit; the user picks one.

## Steps
1. **Registry** — add to `modules/_registry.ts` (import the icon by name at the top):
   ```ts
   {
     id: "<id>",
     name: "<Ime>",
     description: "<the job, one short sentence>",
     icon: <Icon>,
     keywords: ["…"],
     primaryAction: { label: "<label>", href: "/m/<id>?nov=1" },
     summary: () => import("./<id>/summary"),
   },
   ```
2. **Folder** — copy `modules/_template/` to `modules/<id>/` and rename:
   - every `template` / `Template` / `TEMPLATE` identifier → `<id>` / `<Name>`;
   - the table `template_items` → `<id>_items` (or the noun the Card names, still prefixed).
   - Files: `pages.tsx` (server: loads data, renders the page), `item-sheet.tsx` (the create/edit sheet), `item-row.tsx` (row + row menu), `actions.ts` (`moduleContext` first, returns `ActionResult`), `strings.ts` (all Slovenian copy), `summary.ts` (Home tile line), `db/0001_<id>.sql`.
   - For a pattern other than Hitri vnos, also read the pattern's reference module (`invoice_ocr`, `work_orders`, `crm_demo`, `ai_assist`) and reshape the template toward it — e.g. a review queue gets tabs and a review page instead of a month list.
3. **Migration** — `db/0001_<id>.sql`: the prefixed table(s) **with RLS in the same file**, ending with the catalogue row and the owner grant, as in the template:
   `insert into public.core_modules (id, name) values ('<id>', '<Ime>') on conflict (id) do nothing;`
4. **Router** — add a `case "<id>": return <NameModule searchParams={sp} />;` to the switch in `app/(app)/m/[module]/page.tsx`.
5. **⚠️ CRITICAL — run the migration (the module silently fails without it — no table → won't appear or save).** Run it for the user: apply it through the **Supabase MCP** (`apply_migration`, name `<id>_<file without .sql>`, query = the file) when it is connected; otherwise `npm run db:run -- modules/<id>/db/<file>.sql` (needs `SUPABASE_ACCESS_TOKEN`):
   ```
   npm run db:run -- modules/<id>/db/0001_<id>.sql
   ```
   Then confirm the table exists (`select to_regclass('public.<id>_<noun>')`). *(Neither the MCP nor a token? Run `/nastavitev` — it connects the Supabase MCP. Pasting into the SQL Editor is the last resort.)*
6. **Grant** — remind the owner the module appears for them on Home (owners are granted by the migration); grant colleagues in **Administracija** (`/m/admin` → Dostopi).
7. **Feature Card** — if `docs/features/<id>/feature.md` doesn't exist, create it from the template in `docs/features/README.md` with `module`, `title`, `pattern`, `status: planned`, and the Job & moment, Primary action and Tile line you just agreed.

## Rules
- Every table name starts with `<id>_`. Never an unprefixed table.
- Every new table enables RLS with policies in the SAME migration.
- A module never imports another module's files and never reads another module's tables.
- Every exported action starts with `moduleContext("<id>")`.
- All UI copy lives in `strings.ts`, in Slovenian. No developer words in the UI.
- After scaffolding, run `npx tsc --noEmit && npm run lint`, then `/check-architecture`, then open `/home` and check the new tile and its primary action.
