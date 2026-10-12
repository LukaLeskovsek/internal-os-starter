# Internal OS Starter

Your company's internal system: **one app, one sign-in, many tools (modules)**, with
an admin screen that controls who sees what. You can start here without another course or repository.

**Ni treba biti programer:** odpri Claude Code v mapi aplikacije in napiši **»Nastavi mi internal-os«**. Claude te vodi korak za korakom (skill `/nastavitev`); človeška različica navodil je [docs/nastavitev.md](docs/nastavitev.md).

**Tovarna podjemov:** start with [Priprava za delavnico](docs/delavnica.md). Claude helps prepare your own private app and reuses your existing workshop profile.

**Stack:** Next.js 15 · Supabase (auth + database, RLS) · Resend · Sentry · Vercel.
Use your own GitHub and Supabase accounts. Add hosting, email, monitoring and AI services when your feature needs them.

---

## From clone to live app in 7 steps

`/nastavitev` does all of this with you; below are the same steps for people who prefer the terminal.

### 1. Get the code — your own repo
On GitHub, click **"Use this template" → Create a new repository** and set it
**Private** (your own copy to push to — it holds your app *and its history*), then:
```bash
git clone https://github.com/<your-username>/internal-os-starter.git
cd internal-os-starter
npm ci
```
Or in one command: `gh repo create <name> --template LukaLeskovsek/internal-os-starter --private --clone`.
Template source: https://github.com/LukaLeskovsek/internal-os-starter
New to git? Three safe verbs and one rule: [docs/git-basics.md](docs/git-basics.md).

### 2. Create a Supabase project & load the core schema
- supabase.com → **New project** (EU region).
- Keep **Confirm email** on. Colleagues join through **Admin** (created already
  confirmed); public sign-ups become **members with no module grants**, and the owner
  is created by the seed script.
- **Authentication → URL Configuration:** Site URL `http://localhost:3000`, Redirect URLs
  `http://localhost:3000/**` (add the live address later).
- Connect the **Supabase MCP** to this project so Claude can read the URL and public key
  and apply migrations (OAuth, no access token):
  `claude mcp add --transport http --scope local supabase "https://mcp.supabase.com/mcp?project_ref=<ref>&features=database,development,docs,debugging"`,
  then `/mcp` → supabase → Authenticate.

### 3. Fill in your keys, then let Claude load the schema
```bash
cp .env.example .env.local
```
Fill in the Supabase URL + anon key, `SUPABASE_SERVICE_ROLE_KEY` (Settings → API Keys →
the `sb_secret_…` key) and `ADMIN_EMAIL`. `npm run env:check` shows which keys are set
and well-formed without printing them. Leave `INTRIX_API_KEY` / `OPENROUTER_API_KEY`
empty for **demo mode**.

Then ask Claude: **"pripravi bazo"** (set up the database). The full list, in order, is
```bash
npm run db:list          # core 0001–0006, then every module's db/ files
```
Claude applies each file that hasn't run yet through the Supabase MCP (`apply_migration`),
checking each file's probe table first — `0001_core` and `ai_assist/0001` must not run twice.
Without the MCP, `npm run db:run -- <file>` does the same with a `SUPABASE_ACCESS_TOKEN`
(supabase.com → Account → Access Tokens).

Now make yourself the owner:
```bash
npm run dev              # the link below points at the running app
npm run seed:admin       # opens a one-time password link in your browser
```
Press **Nadaljuj**, set the password, and use that account for Admin
(`npm run seed:admin -- --print` prints the link instead, e.g. to send it to someone).

### 4. Run it
Open http://localhost:3000 (with `npm run dev` running) and sign in as the owner. Add
colleagues in **Admin → Uporabniki** and grant them tools in **Dostopi**.

### 5. Add a module
Ask Claude Code:
> "/scaffold-module leads \"Leads\""

It creates `modules/leads/`, registers it, writes a prefixed migration with RLS, and
wires it into the router. Claude then **applies its migration** (Supabase MCP, or
`npm run db:run`); owners get the new module automatically, colleagues in **Admin**.

### 6. Connect an external API (optional)
> "/integrate-api for the leads module"

Model is the `crm_demo` module, which reads contacts from **Intrix** (read-only, with
mock-mode fallback).

### 7. Publish (Vercel)
Import the repo at vercel.com/new, then:
```bash
npx vercel login && npx vercel link
npm run vercel:env -- --site-url https://<project>.vercel.app   # --dry-run first lists the keys
```
Redeploy, add the live address to Supabase **URL Configuration**, and turn off **Vercel
Authentication** (Settings → Deployment Protection) if the live page asks for a Vercel login.
Pushing to `main` deploys from then on.

---

## Included example modules

Worked modules ship with the template — read them to learn the patterns, then build your own (each has its migration in `modules/<id>/db/`, applied in step 3):

| Module | What it shows |
|---|---|
| **Admin** (`admin`) | Owner-only user + module management (service-role client behind owner checks). |
| **CRM (demo)** (`crm_demo`) | A read-only external API with mock-mode fallback — the reference for `/integrate-api`. |
| **AI Assistant** (`ai_assist`) | A server-side LLM call stored in an RLS table — the reference for `/integrate-ai`. |
| **Delovni nalogi** (`work_orders`) | Dispatch: the office assigns, the field closes on a phone — the reference for shared rows (creator or assignee). |
| **Potni nalogi** (`travel_orders`) | Quick entry with derived values (km × rate) — the reference for the default pattern. |
| **Dopusti** (`leave`) | Shared team data (RLS by module grant), work-day counting with Slovenian holidays, a drag-and-drop team calendar. |
| **Likvidacija računov** (`invoice_ocr`) | AI **invoice OCR**: upload a photo/PDF → a vision model reads the header **and every line item** → a liquidation (approve / reject) table with a **per-invoice review screen** (extracted values + line-item table + inline PDF/image preview + a comment) → **CSV export**. Adds a private Supabase **Storage** bucket; the OCR client lives in the module (`lib/ocr.ts`, mock-mode like `crm_demo`). UI is in Slovenian. Needs a vision-capable `OPENROUTER_VISION_MODEL`. |

---

## The rules (and how they're enforced)
- A module is a folder + a registry entry + a `core_modules` row.
- Module access is **data** (`core_user_modules`), checked server-side in `app/m/[module]/page.tsx`.
- Every module table is **prefixed** (`leads_*`) and ships **RLS** in its own migration.
- `/check-architecture` audits all of the above. See `CLAUDE.md` and `docs/architecture.md`.

## Admin — manage users & modules (owners only)
Open **`/m/admin`** with the seeded owner account:
- **Users** — add a person (email + temporary password; no email is sent, you share it), change role (member↔owner), deactivate, or delete. A disabled user is blocked from the whole app.
- **Modules** — turn a tool on/off (a disabled module disappears from launchers and is blocked even if granted), rename its label, and reorder it.
- **Access** — the user × module grant grid.

Adding/role/disable/delete of users runs server-side with the Supabase **secret key**, so set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (Supabase → Settings → API Keys → the `sb_secret_…` key). It bypasses RLS and is used only behind owner checks — never expose it or prefix it with `NEXT_PUBLIC_`.

## Scripts
- `npm run dev` · `npm run build` · `npm run lint` · `npm start`
- `npm run seed:admin` — create/update the initial owner and open a one-time password link (`-- --print` to print it).
- `npm run env:check` — which keys in `.env.local` are set and well-formed (never prints values).
- `npm run db:list` — every migration in order, with how to tell whether it ran (`-- --json` for Claude).
- `npm run db:run -- <file>` — apply one migration with `SUPABASE_ACCESS_TOKEN` (when not using the Supabase MCP).
- `npm run vercel:env -- --site-url <url>` — copy the needed keys to Vercel without printing them.
- `npm run audit:security` — fail on high/critical npm advisories.

## Notes
- The Supabase "Edge Runtime / `process.version`" build warning is expected and harmless.
- Secrets live in `.env.local` and Vercel — never in code, never in chat.
- Security notes: `docs/security.md`.
- How this relates to the Day-2 app: `docs/relationship-to-saas-starter.md`.
