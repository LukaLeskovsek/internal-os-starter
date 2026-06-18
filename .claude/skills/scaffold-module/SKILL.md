---
name: scaffold-module
description: Create a new tool-module in this internal-OS repo from the blueprint. Use when the user says "/scaffold-module", "add a module", "new module", or names a tool they want behind the app's single sign-in.
---

When invoked, create a new module the rails-compliant way. Never hand-create module folders — this skill is the path of least resistance so a clean modular monolith stays clean.

## Ask first (don't invent)
1. The module **id** — lowercase, snake_case. It becomes the database table prefix, e.g. `invoices`.
2. The module **display name**, e.g. "Invoices".

## Steps
1. Add an entry to `modules/_registry.ts`: `{ id, name, description, icon }`.
2. Create `modules/<id>/`:
   - `module.config.ts` — id, name, description (copy `modules/crm_demo/module.config.ts`).
   - `pages.tsx` — exports an async server component `<NameModule>`; start from the `crm_demo` shape.
   - `db/0001_<id>.sql` — a prefixed table stub (`<id>_*`) **with RLS in the same file**, ending with `insert into public.core_modules (id, name) values ('<id>', '<name>') on conflict (id) do nothing;` so the module registers itself. Copy `modules/crm_demo/db/0001_crm_demo.sql`.
3. Wire it into the router: add a `case "<id>":` to the switch in `app/m/[module]/page.tsx`.
4. **⚠️ CRITICAL — tell the user to RUN the migration in Supabase. You cannot do it for them, and the module silently fails without it.** Say: *"Open Supabase → SQL Editor → paste `modules/<id>/db/0001_<id>.sql` → Run."* It creates the prefixed, RLS-protected table **and** registers the module in the catalogue. Until it runs: no table, so the module won't appear in the launcher and can't save.
5. Remind the owner to grant themselves the module in **Admin** (`/m/admin`).

## Rules
- Every table name starts with `<id>_`. Never an unprefixed table.
- Every new table enables RLS with owner-scoped policies in the SAME migration.
- A module never imports another module's files and never reads another module's tables.
- After scaffolding, run `npm run lint && npm run build`, then `/check-architecture`.
