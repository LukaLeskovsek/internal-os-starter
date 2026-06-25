# Internal OS Starter

Your company's internal system: **one app, one sign-in, many tools (modules)**, with
an admin screen that controls who sees what. This is Day 3 — it builds directly on
the Day-2 SaaS starter (same stack, same sign-in), and adds modules.

**Stack:** Next.js 15 · Supabase (auth + database, RLS) · Resend · Sentry · Vercel.
Same accounts you created on Day 2.

---

## Clone to your first module in 6 steps

You can ask Claude Code to do each step with you.

### 1. Get the code — your own repo
On GitHub, click **"Use this template" → Create a new repository** and set it
**Private** (your own copy to push to — it holds your app *and its history*), then:
```bash
git clone https://github.com/<your-username>/internal-os-starter.git
cd internal-os-starter
npm install
```
Template source: https://github.com/LukaLeskovsek/internal-os-starter
New to git? Three safe verbs and one rule: [docs/git-basics.md](docs/git-basics.md).

### 2. Create a Supabase project & load the core schema
- supabase.com → **New project** (EU region).
- Authentication → Sign In / Providers → Email → **"Confirm email" OFF**.
- Copy your **Project URL** + **anon key** (Settings → API). Claude loads the core
  schema for you in the next step — no SQL pasting. (It creates the three `core_*`
  tables + the module catalogue; **the first person to sign up becomes the owner**,
  granted every module.)

### 3. Fill in your keys, then let Claude load the schema
```bash
cp .env.example .env.local
```
Fill in your Supabase URL + anon key, plus a **Supabase access token**
(supabase.com → Account → Access Tokens) so Claude can run your database setup.
Add Resend/Sentry when ready; leave `INTRIX_API_KEY` empty for the demo CRM's **mock mode**.

Then ask Claude: **"run the core migration."** It applies the schema for you:
```bash
npm run db:run -- supabase/migrations/0001_core.sql
```
*(No access token? The command tells you to paste the file into Supabase → SQL Editor.)*
Every module you scaffold later works the same way — Claude runs its migration with `db:run`.

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
wires it into the router. Claude then **runs its migration** (`npm run db:run`); grant
yourself the module in **Admin**.

### 6. Connect an external API (optional)
> "/integrate-api for the leads module"

Model is the `crm_demo` module, which reads contacts from **Intrix** (read-only, with
mock-mode fallback).

---

## Included example modules

Four worked modules ship with the template — read them to learn the patterns, then build your own:

| Module | What it shows |
|---|---|
| **Admin** (`admin`) | Owner-only user + module management (service-role client behind owner checks). |
| **CRM (demo)** (`crm_demo`) | A read-only external API with mock-mode fallback — the reference for `/integrate-api`. |
| **AI Assistant** (`ai_assist`) | A server-side LLM call stored in an RLS table — the reference for `/integrate-ai`. |
| **Likvidacija računov** (`invoice_ocr`) | AI **invoice OCR**: upload a photo/PDF → a vision model reads the fields → a liquidation (approve / reject) table with a **per-invoice review screen** (extracted values + inline PDF/image preview + a comment) → **CSV export**. Adds a private Supabase **Storage** bucket; the OCR client lives in the module (`lib/ocr.ts`, mock-mode like `crm_demo`). UI is in Slovenian. Needs a vision-capable `OPENROUTER_VISION_MODEL`. |

---

## The rules (and how they're enforced)
- A module is a folder + a registry entry + a `core_modules` row.
- Module access is **data** (`core_user_modules`), checked server-side in `app/m/[module]/page.tsx`.
- Every module table is **prefixed** (`leads_*`) and ships **RLS** in its own migration.
- `/check-architecture` audits all of the above. See `CLAUDE.md` and `docs/architecture.md`.

## Admin — manage users & modules (owners only)
Open **`/m/admin`** (you're the owner if you were the first to sign up):
- **Users** — add a person (email + temporary password; no email is sent, you share it), change role (member↔owner), deactivate, or delete. A disabled user is blocked from the whole app.
- **Modules** — turn a tool on/off (a disabled module disappears from launchers and is blocked even if granted), rename its label, and reorder it.
- **Access** — the user × module grant grid.

Adding/role/disable/delete of users runs server-side with the Supabase **secret key**, so set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (Supabase → Settings → API Keys → the `sb_secret_…` key). It bypasses RLS and is used only behind owner checks — never expose it or prefix it with `NEXT_PUBLIC_`.

## Scripts
- `npm run dev` · `npm run build` · `npm run lint` · `npm start`

## Notes
- The Supabase "Edge Runtime / `process.version`" build warning is expected and harmless.
- Secrets live in `.env.local` and Vercel — never in code, never in chat.
- How this relates to the Day-2 app: `docs/relationship-to-saas-starter.md`.
