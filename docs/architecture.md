# Architecture (one page)

## The idea: a modular monolith

One application. One sign-in. Many **modules** (tools). One **admin** screen that
decides which user sees which module. Adding a tool is adding a folder — never a new
app, never a new deployment.

```
sign in  →  /home  (a tile per module YOU may open: status line + main action)
                │        ⌘K anywhere: jump to a tool or run its main action
                ├── /m/admin          ← owner-only: people, modules, access
                ├── /m/crm_demo       ← reads Intrix (read-only, demo fallback)
                └── /m/<your tool>    ← scaffolded with /scaffold-module
                       ?nov=1 opens the create sheet · ?id= opens detail
```

## The four rails

1. **A module is a folder** — `modules/<id>/` + a `_registry.ts` entry + a `core_modules` row.
2. **Access is data, not code** — `core_user_modules` maps users → modules. `/m/[module]`
   checks it **server-side on every request**, every module action re-checks it with
   `moduleContext()`, and Home / ⌘K show only granted modules.
3. **Module tables are prefixed** — `crm_demo_*`. Each module's migrations live in its own
   `db/` folder with RLS. No module reads another module's tables.
4. **Admin is a module too** — granted only to seeded owners.

## Request flow for a module

```
/m/crm_demo
  → (app)/layout.tsx     : are you signed in?           (else → /login)
  → m/[module]/page.tsx  : are you GRANTED this module?  (else → "no access")
  → modules/crm_demo/pages.tsx renders
```

The guard is in one place. New modules add a `case` to the switch; they never touch
the guard. Writes go through Server Actions that start with `moduleContext("<id>")` and
return an `ActionResult` the UI shows as a toast.

## Home tiles

```
/home
  → getLauncherModules()          : granted + enabled modules, in the owner's order
  → for each tile, in parallel     : modules/<id>/summary.ts  (own table, RLS client,
                                     1.5 s timeout, null on error)
```

Core calls into modules through the registry; modules never call each other.

## Where things live

- `modules/_registry.ts` — the list of modules (id, name, job, icon, primary action, summary).
- `modules/<id>/` — `pages.tsx`, client components, `actions.ts`, `strings.ts`,
  `summary.ts`, `lib/`, `db/<id>_*.sql`. `modules/_template/` is the scaffold source.
- `app/(app)/m/[module]/page.tsx` — the router + access guard.
- `app/(app)/home/` — the launcher tiles.
- `components/app/` — shared UI (sheets, lists, empty states, ⌘K, header pieces).
- `lib/format.ts`, `lib/i18n/` — Slovenian formatting and copy.
- `lib/action-result.ts`, `lib/module-context.ts` — the action pattern.
- `app/login/`, `lib/supabase/`, `lib/access.ts` — auth + access checks (pre-built).
- `supabase/migrations/0001_core.sql` — `core_profiles`, `core_modules`, `core_user_modules`,
  the `is_owner()` function and RLS. The owner is created by `npm run seed:admin`
  (0004 removed the old first-user-becomes-owner rule); every later sign-up is a member
  with no grants. `npm run db:list` gives all core and module migrations in order.

## Why `is_owner()` is a database function

RLS policies need to ask "is the current user an owner?" — which means reading
`core_profiles` from inside a `core_profiles` policy. That recurses. The
`is_owner()` SECURITY DEFINER function reads the table without re-triggering RLS, so
the policies stay simple and safe.
