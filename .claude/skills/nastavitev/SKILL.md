---
name: nastavitev
description: Set up internal-os from zero for a non-technical founder, step by step — tools on the computer, their own GitHub copy, Supabase (project, Supabase MCP, keys into .env.local), database migrations, the first owner, running locally, optional AI (OpenRouter), publishing on Vercel and the profile pointer. Checks what is already done and continues from the first missing step. Use when the user says "/nastavitev", "nastavi mi internal-os", "namesti", "setup", "nov računalnik", "kam dam ključe", "ne dela prijava po namestitvi", "objavi prvič na Vercel".
---

When invoked, get this person's internal-os running — on their computer and, when they want, live —
**doing every step you safely can yourself** and asking them only for what must be theirs:
creating accounts, accepting terms, payments, passwords, two-factor codes and pasting secret keys.

The person is not technical. Speak Slovenian, one step at a time, short sentences. Before each
step say in one line what it is for ("Supabase je baza in prijava za tvojo aplikacijo."). After
each step check it worked before moving on. `docs/nastavitev.md` is the human-readable version of
this skill — keep them in step.

## Ground rules (non-negotiable)

1. **No secret ever enters the chat.** Secret keys (`SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`,
   `SUPABASE_ACCESS_TOKEN`, `RESEND_API_KEY`, `INTRIX_API_KEY`, `ZOHO_ACCESS_TOKEN`, database
   password) go from the provider's page **straight into `.env.local`** (or Vercel) by the person.
   If they paste one into the chat anyway: don't repeat it, tell them to rotate it in the provider's
   dashboard, and continue.
2. **Never read a secret.** Don't `cat` `.env.local` or print a value. Check keys only with
   `npm run env:check` (prints ✓/✗/⚠, never values).
3. **Public values you write yourself:** Supabase URL, anon/publishable key, `ADMIN_EMAIL`,
   `ADMIN_FULL_NAME`, `NEXT_PUBLIC_SITE_URL`, `AI_BACKEND`, model ids. Edit the line in place with a
   small Node script; don't echo the result.
4. **Browser:** open the exact page the person needs:
   - With **Claude in Chrome** connected, you may navigate and read *non-secret* pages (project
     list, URL, settings) and click through navigation.
   - Without it, run `open "<url>"` (macOS), `start "" "<url>"` (Windows) or `xdg-open "<url>"`.
   - **Never read, screenshot or record a page while a key is shown on it.** Hand over and wait.
5. **The person does:** sign-ups, logins (`! gh auth login --web`, `! npx vercel login` — tell them
   to type the `!` line), organisation and region choices, payment and spending limits, the database
   password (into their password manager, not to you), OAuth consent screens, "Redeploy" and
   on/off switches that are account settings.
6. **Ask before anything that leaves the machine:** creating the GitHub repo, `git push`,
   `vercel:env` (sends keys to Vercel), migrations on a database that already has data.
7. One step at a time. If a step fails twice, stop and say plainly what you saw. `/debug` lists this
   repo's known traps.

## Step 0 — Where are we? (always first)

Run these quietly and show a short ✓/✗ list in Slovenian; then start at the first ✗. Re-run the
list whenever the person comes back ("nadaljuj nastavitev").

| # | Check | How |
|---|---|---|
| 1 | Tools | `node -v` (≥ 22), `git --version`, `gh --version`, `gh auth status`, `claude --version` |
| 2 | Own copy | `gh repo view --json nameWithOwner,visibility` — their account, `PRIVATE`; not `LukaLeskovsek/internal-os-starter` |
| 3 | Supabase project + MCP | Supabase MCP tools available (e.g. `get_project_url`) and answering for one project |
| 4 | Keys | `npm run env:check` — Supabase lines ✓ |
| 5 | Sign-in settings | ask, or check in Chrome: Site URL + Redirect URLs set (Step 5) |
| 6 | Database | probe query from Step 6 → all `true` |
| 7 | Owner | MCP `execute_sql`: `select count(*) from public.core_profiles where role = 'owner' and not disabled` → ≥ 1 |
| 8 | Runs locally | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login` → 200 |
| 9 | AI (optional) | `env:check`: local subscription auth ✓, or explicitly selected hosted/API mode with a capped key; real call verified separately |
| 10 | Live (optional) | `.vercel/project.json` exists and the live `/login` returns 200 |
| 11 | Profile (optional) | `.claude/profile-location.local.md` exists |

## Step 1 — Tools on the computer

- **Claude Code CLI for local app AI:** check `claude --version` first. Desktop Code alone does not prove that the app can invoke `claude` on PATH. If missing, use the official platform-specific native installer from https://code.claude.com/docs/en/setup; preserve working installs. The person signs in with their own Claude subscription; then env:check validates the same isolated environment used by the app. Never create or request an API key for this local path.

- **Node 22+:** missing or older → open `https://nodejs.org/en/download` (LTS installer); they run it,
  then restart the terminal and Claude Code.
- **git:** macOS without git → `xcode-select --install` (they confirm the dialog). Windows →
  `https://git-scm.com/download/win`.
- **GitHub CLI (`gh`):** `brew install gh` if Homebrew exists, else open `https://cli.github.com`.
- **GitHub login:** no account → open `https://github.com/signup`. Then they type
  `! gh auth login --web` and finish in the browser.
- **Packages:** `npm ci`.

## Step 2 — Their own private copy on GitHub

- Starting from nothing (not inside the repo yet): `gh repo create <ime> --template
  LukaLeskovsek/internal-os-starter --private --clone`. Claude Code reads this repo's CLAUDE.md and skills only
  when started inside it, so tell them: "Zapri Claude Code (`/exit`), napiši `cd <ime>` in `claude`,
  nato: Nastavi mi internal-os."
- Inside a clone of the template (origin is `LukaLeskovsek/internal-os-starter`): ask for a name,
  then `git remote rename origin template` and `gh repo create <ime> --private --source=. --remote=origin --push`.
- Check: `gh repo view --json visibility` → `PRIVATE`.

## Step 3 — Supabase project (they create it), then Supabase MCP (you connect it)

1. Open `https://supabase.com/dashboard/new` (sign-up first if needed: `https://supabase.com/dashboard/sign-up`,
   GitHub login is fine). They choose: organisation, project name, **Region: Central EU (Frankfurt)**,
   and a **database password** → into their password manager. Free plan is enough.
2. Get the **project ref** (20 lowercase letters/digits): from the address bar
   (`supabase.com/dashboard/project/<ref>`) — read it in Chrome or ask them to paste the address; it is
   not a secret.
3. Connect the MCP **scoped to this one project**:
   ```
   claude mcp add --transport http --scope local supabase "https://mcp.supabase.com/mcp?project_ref=<ref>&features=database,development,docs,debugging"
   ```
   Then tell them: "Zapri Claude Code (`/exit`), ga znova odpri v tej mapi, napiši `/mcp`, izberi
   **supabase → Authenticate**, v brskalniku potrdi in izberi organizacijo. Potem napiši: nadaljuj
   nastavitev." (OAuth replaces the account-wide `SUPABASE_ACCESS_TOKEN`; it is no longer needed.)
4. Check: MCP `get_project_url` returns `https://<ref>.supabase.co`.

## Step 4 — Keys into `.env.local`

1. `.env.local` missing → `cp .env.example .env.local`.
2. You write the public values:
   - `NEXT_PUBLIC_SUPABASE_URL` (from `get_project_url`);
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from `get_publishable_keys`: the legacy `anon` key if listed,
     else the `sb_publishable_…` key);
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000`;
   - `ADMIN_EMAIL` and `ADMIN_FULL_NAME` (ask them — the owner's e-mail and name).
3. **The secret key — they paste it:**
   - Open `https://supabase.com/dashboard/project/<ref>/settings/api-keys` and the file:
     `open -e .env.local` (macOS TextEdit) / `notepad .env.local` (Windows).
   - Tell them: "Na strani pri **Secret keys** kopiraj ključ `sb_secret_…` (ustvari ga, če ga ni).
     V datoteki ga prilepi takoj za `SUPABASE_SERVICE_ROLE_KEY=` — brez presledkov in narekovajev.
     Shrani (⌘S) in zapri. Meni ga ne pošiljaj."
4. Check: `npm run env:check`. Fix any ⚠ (a key in the wrong line, a secret pasted into a `#` comment).

## Step 5 — Sign-in settings in Supabase

Open `https://supabase.com/dashboard/project/<ref>/auth/url-configuration`. They set:
- **Site URL:** `http://localhost:3000` (changes to the live address in Step 10).
- **Redirect URLs → Add URL:** `http://localhost:3000/**`.
Leave **Confirm email** on (Authentication → Sign In / Providers → Email): colleagues are added by
the owner in Administracija, already confirmed; public sign-up is not how people join.

## Step 6 — Database (migrations through Supabase MCP)

1. `npm run db:list -- --json` → every file in order, with `probe` (a table that exists once the file
   ran) and `rerunSafe`.
2. One MCP `execute_sql`: `select to_regclass('<probe>') is not null as "<file>", …` for every file
   with a probe.
3. Apply, in list order, every file whose probe is `false`, plus every probe-less file (they are all
   `rerunSafe`; skip them only when nothing else is being applied and the database is not new):
   MCP `apply_migration` with `name` = `<module>_<file without .sql>` (e.g. `leave_0001_leave`) and
   `query` = the file's content. Never apply a file whose probe is `true` — `0001_core` and
   `ai_assist/0001` fail or duplicate on a second run.
4. Check: the probe query again → all `true`.
5. No MCP (the person declined it): `npm run db:run -- <file>` per file needs `SUPABASE_ACCESS_TOKEN`
   (supabase.com → Account → Access Tokens, pasted by them into `.env.local`) — same order, same probes.

## Step 7 — Start the app

Start `npm run dev` in the background (never `npm run build` while it runs). Wait until
`http://localhost:3000/login` answers 200.

## Step 8 — The first owner

`npm run seed:admin` — makes `ADMIN_EMAIL` the owner, grants every tool, and **opens** a one-time
link in the browser (it is a credential; don't use `--print` unless they must send it to someone).
They press **Nadaljuj**, set a password, and land on Home with all tiles.
Check: the owner query from Step 0 → ≥ 1. If the link says it is invalid: run `seed:admin` again
(it is safe) and open the newest link.

## Step 9 — AI in the app (optional)

Local workshop default is `AI_BACKEND=local-claude`. Reuse the existing Claude login;
run `npm run env:check` to confirm an installed claude.ai subscription, not Console
OAuth or an API credential. Check plan limits and optional paid usage credits in
the user's account. Text/images/PDFs share the same isolated local path.

No valid login or a failed call means an explicit failure, never automatic API or
sample-output fallback. Do not expose the local CLI through a tunnel or to others.
The app may still run without AI. OpenRouter is a separate explicit choice for
hosted AI: user enters a capped key directly in `.env.local`, disables auto top-up,
sets `AI_BACKEND=openrouter` and verifies the selected model. Preserve the daily
application call cap as well. Do not print credentials or invent a successful call.

## Step 10 — Live on the internet (optional, when they want to share it)

1. Open `https://vercel.com/new`; they sign up with GitHub and **Import** their repo (defaults are
   right). A first build may fail without keys — fine.
2. They type `! npx vercel login`; you run `npx vercel link --yes --project <name>`.
   `vercel link` appends `.env*` to `.gitignore` (that hides `.env.example`) and a
   `VERCEL_OIDC_TOKEN` to `.env.local`: `git checkout -- .gitignore`; the token line may stay.
   Existing Vercel variables marked Sensitive can't be read back (`env pull` shows
   `[SENSITIVE]`); when in doubt, overwrite them with step 4.
3. Ask, then run `npm run vercel:env -- --site-url https://<project>.vercel.app` (sends the keys
   without printing them; `--dry-run` first shows the list).
4. Redeploy: open the project's **Deployments** page; they click **Redeploy** on the latest one.
5. Supabase sign-in settings (Step 5 page): **Site URL** → the live address; **Redirect URLs** → add
   `https://<project>.vercel.app/**` (keep the localhost one).
6. If the live address shows a Vercel login: open `https://vercel.com/<team>/<project>/settings/deployment-protection`;
   they turn off **Vercel Authentication**.
7. Same Supabase project for local and live (the default here): migrations and the owner are already
   there. A separate production project needs Steps 3–8 against it.
8. Check: open the live `/login`; they sign in with the same password; Home shows the tiles.

## Step 11 — Profile pointer (optional)

If they have a profile folder (PERSON.md, INDEX.md, a company folder with COMPANY.md, BRAND.md,
PRIMERI.md), ask for its path and the company, then write `.claude/profile-location.local.md`
(gitignored):
```
# Profil za to aplikacijo
pot: /pot/do/profila
podjetje: <ime mape podjetja>
potrjeno: <YYYY-MM-DD>
```
Don't copy profile content into the repo.

## Finish

Show the Step 0 list again, all ✓ (optional ones marked "preskočeno"), the local and live
addresses, and one next step: "Povej, kaj bi rad imel — npr. »rad bi orodje za dopuste«."
