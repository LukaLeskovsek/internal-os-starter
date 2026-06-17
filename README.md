# Internal OS Starter

Your company's internal system: **one app, one sign-in, many tools (modules)**, with
an admin screen that controls who sees what. This is Day 3 — it builds directly on
the Day-2 SaaS starter (same stack, same sign-in), and adds modules.

**Stack:** Next.js 15 · Supabase (auth + database, RLS) · Resend · Sentry · Vercel.
Same accounts you created on Day 2.

---

## Clone to your first module in 6 steps

You can ask Claude Code to do each step with you.

### 1. Get the code
On GitHub, click **"Use this template" → Create a new repository**, then:
```bash
git clone https://github.com/<your-username>/internal-os-starter.git
cd internal-os-starter
npm install
```
Template source: https://github.com/LukaLeskovsek-ZebraBI/internal-os-starter

### 2. Create a Supabase project & load the core schema
- supabase.com → **New project** (EU region).
- Authentication → Sign In / Providers → Email → **"Confirm email" OFF**.
- SQL Editor → paste `supabase/migrations/0001_core.sql` → **Run**. This creates the
  three `core_*` tables and seeds the module catalogue. **The first person to sign up
  becomes the owner** and is granted every module.

### 3. Fill in your keys
```bash
cp .env.example .env.local
```
Fill in Supabase + (when ready) Resend, Sentry, and Intrix. Leave `INTRIX_API_KEY`
empty to run the demo CRM module in **mock mode**.

### 4. Run it
```bash
npm run dev
```
Open http://localhost:3000, create your account (you become the owner), and you land
on the launcher with every module.

### 5. Add a module
Ask Claude Code:
> "/scaffold-module leads \"Leads\""

It creates `modules/leads/`, registers it, writes a prefixed migration with RLS, and
wires it into the router. Run its `db/` migration in Supabase, then grant yourself the
module in **Admin**.

### 6. Connect an external API (optional)
> "/integrate-api for the leads module"

Model is the `crm_demo` module, which reads contacts from **Intrix** (read-only, with
mock-mode fallback).

---

## The rules (and how they're enforced)
- A module is a folder + a registry entry + a `core_modules` row.
- Module access is **data** (`core_user_modules`), checked server-side in `app/m/[module]/page.tsx`.
- Every module table is **prefixed** (`leads_*`) and ships **RLS** in its own migration.
- `/check-architecture` audits all of the above. See `CLAUDE.md` and `docs/architecture.md`.

## Scripts
- `npm run dev` · `npm run build` · `npm run lint` · `npm start`

## Notes
- The Supabase "Edge Runtime / `process.version`" build warning is expected and harmless.
- Secrets live in `.env.local` and Vercel — never in code, never in chat.
- How this relates to the Day-2 app: `docs/relationship-to-saas-starter.md`.
