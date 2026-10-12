# How this relates to the SaaS starter (Day 2 → Day 3)

The whole point of the build track: **Day 3 should feel like Day 2 plus one concept.**
This repo is the SaaS starter's sibling ([LukaLeskovsek/saas-starter](https://github.com/LukaLeskovsek/saas-starter)):
the foundations are shared, and the new surface is small and nameable: **modules**.
Both were brought to the same level on 2026-10-12.

## Shared (same code, so Day 2 habits carry over)

| Thing | Files | Notes |
|---|---|---|
| Stack | `package.json`, `.nvmrc` | Next.js 15.5.27, React 19, TS strict, Tailwind 4, npm, Node 22 |
| Supabase clients + session | `lib/supabase/{client,server,middleware}.ts`, `middleware.ts` | Identical. |
| Sign-in | `app/login/` | Same page (AuthShell, Slovenian, translated errors, "Pozabljeno geslo?") and the same actions; sign-in lands on `/home` here and `/dashboard` there. |
| Forgotten password | `app/forgot-password/`, `app/auth/callback/`, `app/auth/recovery/`, `app/(app)/setup-password/` | Identical apart from the landing page. See `docs/password-recovery.md`. |
| Look and feel | `app/globals.css`, `app/layout.tsx`, `config/brand.ts`, `components/ui/*`, the generic `components/app/*` | Same tokens (`--brand`, `--neutral-hue`), Figtree, light/dark, same building blocks. |
| Slovenian copy | `lib/i18n/sl.ts`, `lib/i18n/auth-errors.ts`, `lib/format.ts` | Same shell and sign-in words; each repo adds its own pages. |
| Error tracking | `instrumentation*.ts`, `sentry.*.config.ts`, `app/global-error.tsx` | Identical Sentry wiring. |
| Email | `lib/email.ts` | Same Resend wrapper (used by Day 2's requests). |
| AI | `lib/ai.ts`, `lib/ai-budget.ts` | Same `generate()`: verified local Claude by default; explicit OpenRouter with the daily API call budget. |
| Setup | `/nastavitev`, `docs/nastavitev.md`, `scripts/{env-check,db-list,db-run,vercel-env,audit-security}.mjs` | Same steps and helpers; Day 3 adds the owner (`seed:admin`). |
| RLS discipline | every migration | "Every table enables RLS in the same migration." |

**One deliberate difference in setup:** on Day 2 everyone signs themselves up, so Supabase
"Confirm email" is turned **off** (sign-up signs you in at once). On Day 3 colleagues are added
by the owner in Administracija, already confirmed, so "Confirm email" stays **on**.

**Never share one Supabase project between the two apps.** Both create
`public.handle_new_user()` and the `on_auth_user_created` trigger; the second app's migration
would replace the first one's and break its sign-up.

## The one new concept: modules

Everything different exists to support "one app, many tools, one sign-in, controlled access":

| Day 2 (SaaS) | Day 3 (Internal OS) | Why |
|---|---|---|
| One product, one feature (`requests`) | Many **modules** behind one sign-in | A company system is several tools, not one. |
| `app/(app)/dashboard` + `feature/` | `app/(app)/home` launcher + `app/m/[module]` router | The launcher shows only your modules; the router is the single access guard. |
| `profiles` + `requests` tables | `core_profiles` (with **role**) + `core_modules` + `core_user_modules` | Access becomes data: who-sees-what is rows, not code. |
| Auth guard only | Auth guard **+ per-module access check** | A member can't reach a module by URL. |
| No admin | **Administracija** — users, tools and the user × module grid | "The difference between a toy and a company system." |
| Tables: `requests` | Tables: **prefixed per module** (`crm_demo_*`) | Data never blurs across modules. |
| Simple header | Module switcher + ⌘K | Many tools need a way to jump between them. |
| — | An **external API** integration (`crm_demo` → Intrix, read-only, mock fallback) | The skill founders can't easily self-teach. |
| Skills: `/nastavitev`, `/plan`, `/build`, `/verify`, `/debug`, `/ship`, `/integrate-ai` | The same **+** `/scaffold-module`, `/check-architecture`, `/integrate-api` | The "Compound Engineering variation": best practices pre-applied so the agent builds inside the rails. |

## The teaching arc

- **Day 2** proves: *I can ship a real, secure app I own.*
- **Day 3** proves: *I can grow it into a system of tools with controlled access — and the
  agent stays on the rails because the rails are written into the repo.*

The closing Day-3 block names this explicitly: the architecture skills you used all day
are the Compound-Engineering idea, pre-applied to this repo.
