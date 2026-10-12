# CLAUDE.md — rules for working in this repo

This is an **internal company system** built as a **modular monolith**: one app,
one sign-in, many tool-modules, and an admin surface that decides which user sees
which module. It can be used independently. Historical context is in `docs/relationship-to-saas-starter.md`; completing that course is not a prerequisite. Workshop setup is in `docs/delavnica.md`.

## First, read the founder's context

Before planning or writing, read the profile at the confirmed location in `.claude/profile-location.local.md`, if present. That local-only pointer must select the company for this app. Read PERSON.md and INDEX.md, then the selected COMPANY.md, BRAND.md and PRIMERI.md. If the pointer is missing or unavailable, use existing root-level PERSON.md / COMPANY.md / BRAND.md as a starting point; ask only about missing context. Never copy the whole profile into the public starter or overwrite global instructions. In a new conversation, verify the location again. A development profile does not automatically become context for model calls inside the app; select and review those rules separately.

## You pick the skill — the founder never has to remember one

The founder talks normally ("rad bi orodje za dopuste", "to ne dela", "daj v živo").
**You** choose the skill from `.claude/skills/`, say in one line which one and why
("Uporabim /plan, da najprej razjasniva, kdo in kdaj bo to uporabljal."), and run it.
Slash commands still work, but never ask the founder to type one.

| When the founder… | Run |
|---|---|
| is setting up the app, a new computer, keys or the first publish ("nastavi mi internal-os") | `/nastavitev` |
| describes an idea, a new tool, or a change in behaviour | `/plan` (always first — no code before the Card exists) |
| agrees to the plan ("ja", "naredi", "gremo") or asks for the next step | `/build` — and `/scaffold-module` first if it's a new tool |
| wants AI to read, draft, sort, summarise or answer | `/integrate-ai` |
| wants data from another system (CRM, ERP, Zoho, Intrix, an API) | `/integrate-api` |
| asks "ali dela?", "preveri", or a slice was just built | `/check-architecture`, then `/verify` |
| reports an error, pastes one, or says something is broken / slow | `/debug` |
| wants it live, deployed, shared with the team | `/ship` (only after a passing `/verify`) |

Chain the loop yourself: after `/build`, run `/check-architecture` and offer `/verify`;
after a passing `/verify`, offer `/ship`. Ask before anything that leaves the machine
(push, deploy, a write to an external system) — everything else, just do.
A small fix inside an existing module ("spremeni besedilo gumba") needs no skill:
make it, then run `/check-architecture`.

## The four architecture rules (non-negotiable)

1. **A module is a folder** under `modules/<id>/` plus a registry entry and a
   `core_modules` row. Adding a tool never means a new deployment.
2. **Module access is data, not code.** The `core_user_modules` table maps users to
   modules. `/m/[module]` checks it server-side on every request, and every module
   action re-checks it with `moduleContext()`; Home and ⌘K show only granted modules.
   Never gate a module with a hardcoded user list.
3. **Every module's tables carry the module prefix** — `crm_demo_contacts`, never
   `contacts`. Migrations live in the module's own `db/` folder. **Cross-module table
   access is forbidden**; modules talk only via their own data.
4. **Admin is a module too** (`admin`), granted only to the owner.

## Build for the person, not for the table

This is the most important rule for every screen you add. A module exists to get **one
job** done for **one person at one moment** ("the field worker, on a phone, right after
the visit, closes the work order"). Design that moment first; the database comes last.

Never start from table → form → list. Start from: *who, when, where, and what does
"done" look like for them?* Then pick the pattern in `docs/ux-patterns.md` and copy its
reference module. Storage is whatever that flow needs, nothing more.

## Design & UX rules

1. **Job first.** Write the job sentence before any code (it goes into the Feature Card).
2. **Fewest inputs.** Defaults, prefill from the last entry, "Ponovi" (repeat), chips for
   recent values. Optional fields collapsed behind "Dodaj …". If a field can be derived,
   don't ask for it.
3. **One primary action per screen**, registered as `primaryAction` in
   `modules/_registry.ts` (it shows on the Home tile and in ⌘K) with shortcut **N**.
4. **Create and edit happen in a sheet** (`FormSheet`), never a form permanently open
   above a list. Detail opens in a `DetailSheet` over the list (`?id=`), or a focused page
   for queue work.
5. **Feedback without leaving the page.** Actions return `ActionResult`; the UI shows a
   toast, optimistic where safe, with "Razveljavi" (undo) for reversible changes.
6. **Slovenian copy, in `modules/<id>/strings.ts`.** Dates, money, km and plurals go through
   `lib/format.ts` — never show a raw ISO date or `toFixed()` number.
7. **No developer text in the UI**: no env-var names, table names, ids, skill names, "RLS",
   "mock". Say "Demo podatki" instead.
8. **Every list has a friendly `EmptyState`** that offers the primary action.
9. **Mobile first.** Rows (`DataList`/`ListRow`), not wide tables; 40px tap targets; the
   page's primary action becomes a sticky bottom button on phones (`PageHeader` does it).
10. **Keyboard**: Esc closes, Enter submits, N creates; queues add J/K (next/prev) and A/R.
11. **Tokens only**: `bg-primary`, `text-muted-foreground`, `bg-accent`, `bg-success/12`…
    Never hex values or Tailwind palette colours (`bg-blue-500`).
12. **Base UI, not Radix**: compose with `render={<Link href="…" />}`, never `asChild`.

## The module contract

Every module tells the shell about itself in `modules/_registry.ts` (`lib/modules.ts` has
the types): `id`, `name`, `description` (the job, one sentence), `icon` (from
lucide.dev/icons), `primaryAction` (`{ label, href: "/m/<id>?nov=1" }`), optional
`actions` and `keywords` for ⌘K, and optional `summary` → `modules/<id>/summary.ts`, the
one-line status on the Home tile ("3 za pregled").

A `summary.ts` uses **only** the RLS client it is given and **only** its own `<id>_*`
tables, makes one cheap query, never calls an external API and never uses the admin
client. Home times it out after 1.5 s.

Module pages receive `{ searchParams }`: `?nov=1` opens the create sheet (that's how the
Home tile and ⌘K deep-link into it), `?id=` opens detail, `?f=` filters, `?tab=` picks a tab.

## The action pattern

```ts
"use server";
export async function createTrip(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await moduleContext("travel_orders");   // signed in + granted + module on
  if (!ctx.ok) return ctx;
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fromZod(parsed.error);
  const { error } = await ctx.supabase.from("travel_orders_trips").insert({ … });
  if (error) return fail(s.saveFailed);
  revalidatePath("/m/travel_orders");
  return ok(s.saved);
}
```

Form actions take `(prev, formData)` and are used with `ActionForm`/`FormSheet`. Button
actions take typed arguments (`setStatus(id, "v_delu")`) and are called through
`useActionToast()`. Never `redirect()` for feedback.

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
- **AI in a module: server-side, through `lib/ai.ts`.** Never call an LLM from a
  client component or expose `OPENROUTER_API_KEY`. Store AI output in the module's
  own prefixed, RLS-scoped table; read only this module's data. Use `/integrate-ai`;
  model it on the `ai_assist` module.
- **After any change**, run `npx tsc --noEmit && npm run lint`, then `/check-architecture`.
  Run `npm run build` only when `npm run dev` is **not** running (both write `.next`; a
  build under a live dev server corrupts it — stop dev, build, `rm -rf .next`, restart dev).
- **Undo via `git revert`, never `git reset --hard` or `git push --force`.** If a change
  broke a working state, revert to the last good commit and re-verify. The history is the
  safety net — keep it intact.

## Admin (owners only)

`modules/admin/` manages **users** (add / role / disable / delete) and **modules**
(enable-disable / rename / reorder), plus the access grid. User add/role/disable/delete
use `lib/supabase/admin.ts` — a **service-role** client (`SUPABASE_SERVICE_ROLE_KEY`,
the `sb_secret_…` key) that **bypasses RLS**, so the `isOwner` check at the top of each
action is the security boundary. Never expose that key, never `NEXT_PUBLIC_` it, never
import the admin client into a client component. A disabled user is blocked by the
`(app)` guard; a disabled module is blocked by the `/m/[module]` router.

## Core vs. your modules

The template maintains the core; you extend it through `modules/`. Hands off:

- `app/login/actions.ts`, `app/auth/`, the `(app)` layout guard and the
  `app/(app)/m/[module]/page.tsx` guard (add a `case`, don't change the guard).
- `lib/` security helpers: Supabase clients, `access.ts`, `module-context.ts`, the admin
  client, `ai.ts` (call `generate()`, don't rewrite the wiring).
- Core migrations (`supabase/migrations/`) that have already run.
- Another module's folder.

Copy and shared UI live in `lib/i18n/`, `lib/format.ts` and `components/app/` — reuse
them; propose a change there rather than forking a copy into your module.

## Your build loop (skills in `.claude/skills/`)

The order is **`/plan` → `/build` → `/check-architecture` → `/verify` → `/ship`**, with
`/debug` only when something breaks; `/scaffold-module`, `/integrate-api` and
`/integrate-ai` are used along the way. The routing table above says which one to run;
the Feature Card (`docs/features/<id>/feature.md`) carries the state between them.
Day 3 reveals Compound Engineering (`/ce-plan` …) as the graduation.

## Workflow mode — pull requests OFF

**Pull requests: OFF** — solo founder, trunk-based.

While OFF:
- `/build` commits; `/ship` pushes straight to `main` (push = deploy).
- A risky change may use a short-lived branch for a preview URL, then **merge into `main` locally** (`git checkout main && git merge <branch> && git push`). **Never open a pull request while this is OFF.**
- Undo with `git revert`; never `git reset --hard` or `git push --force`.

To turn pull requests ON (a teammate joins, or you want review before deploy), change the line above to `Pull requests: ON` and see `docs/workflow-mode.md`. When ON, `/ship` opens a PR (`gh pr create`) and merges when checks pass.

## Look and rebrand

Friendly and warm, shadcn/ui on Base UI + Tailwind v4. Rebrand in three places, never in
component files: the tokens at the top of `app/globals.css` (`--brand`, `--neutral-hue`,
`--radius` — ask Claude to convert the BRAND.md colour to oklch), the font in
`app/layout.tsx`, and `config/brand.ts` (name, tagline, footer). Light and dark mode both
work; check both. Shared building blocks are in `components/app/` (`PageHeader`,
`EmptyState`, `DataList`/`ListRow`, `FormSheet`, `DetailSheet`, `ActionForm`, `Field`,
`StatusBadge`, `FilterChips`, `Info`). Submit buttons are `<SubmitButton>`. All signed-in
pages live under `app/(app)/`.

## Build/run
- `npm run dev` · `npx tsc --noEmit && npm run lint` (must pass) · `npm run build` with dev stopped.
- A Supabase Edge Runtime warning on build (`process.version`) is expected and harmless.
