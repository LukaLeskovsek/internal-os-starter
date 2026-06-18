# CLAUDE.md — rules for working in this repo

This is an **internal company system** built as a **modular monolith**: one app,
one sign-in, many tool-modules, and an admin surface that decides which user sees
which module. It is the Day-3 sibling of the Day-2 SaaS starter — same stack, same
auth, same conventions. The only new ideas are **modules, module access, and the
API integration**. See `docs/relationship-to-saas-starter.md`.

## First, read the founder's context

Before branding or copy work, read `PERSON.md`, `COMPANY.md`, `BRAND.md` if present
and write in that voice. If missing, ask — don't invent.

## The four architecture rules (non-negotiable)

1. **A module is a folder** under `modules/<id>/` plus a registry entry and a
   `core_modules` row. Adding a tool never means a new deployment.
2. **Module access is data, not code.** The `core_user_modules` table maps users to
   modules. `/m/[module]` checks it server-side on every request; the launcher renders
   only granted modules. Never gate a module with a hardcoded user list.
3. **Every module's tables carry the module prefix** — `crm_demo_contacts`, never
   `contacts`. Migrations live in the module's own `db/` folder. **Cross-module table
   access is forbidden**; modules talk only via their own data.
4. **Admin is a module too** (`admin`), granted only to the owner.

## How to work

- **New module = run `/scaffold-module`.** Never hand-create module folders.
- **Every new table starts with its module prefix, and every migration includes its
  RLS policies** in the same file:
  ```sql
  alter table public.<id>_<name> enable row level security;
  create policy "<id>_<name>: owner all" on public.<id>_<name>
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  ```
- **External APIs: server-side only, key from `process.env`. Read before write** —
  a write call back to an external API needs explicit owner approval in the spec.
  Use `/integrate-api`; model it on `modules/crm_demo/lib/intrix.ts`.
- **After any change**, run `npm run lint && npm run build`, then `/check-architecture`.

## Never modify

- `app/login/`, `lib/` — auth, Supabase clients, access checks, email.
- `app/m/[module]/page.tsx` guard logic (add a `case`, don't change the guard).
- Core migrations (`supabase/migrations/`) that have already run.
- Another module's folder.

## Your build loop (skills in `.claude/skills/`)

Drive the work with these, in order: **`/plan`** (shape the idea, no code) → **`/build`** (one slice — a new tool means `/scaffold-module`) → **`/verify`** (run it, incl. the member/owner access checks, then `/check-architecture`) → **`/debug`** (only if it breaks) → **`/ship`** (go live and confirm the public URL). The architecture skills (`/scaffold-module`, `/check-architecture`, `/integrate-api`) are used along the way. Day 3 reveals Compound Engineering (`/ce-plan` …) as the graduation.

## Build/run
- `npm run dev` · `npm run lint && npm run build` (must pass).
- A Supabase Edge Runtime warning on build (`process.version`) is expected and harmless.
