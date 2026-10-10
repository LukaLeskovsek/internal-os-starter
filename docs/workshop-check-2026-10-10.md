# Workshop preparation check 2026-10-10

Base commit: `99b7e18fa11fd947bc92aa46cdf023678eab5545`. Changes are local and unpublished.

- Fresh dependency installation completed with npm ci --ignore-scripts.
- npm run lint passed before and after updates; next lint is deprecated, not failing.
- Production build passed before and after updates on Node 24.18.0.
- npm ls --depth=0 passed after updates. No override remains in package.json.
- npm audit started at 2 critical, 19 high and 6 moderate; final state is 0 critical, 10 high and 1 moderate. See [security notes](security.md). The security gate still fails.
- Workshop onboarding no longer assumes Day 2, shared Intrix credentials or a Hermes account. Existing profile instructions are linked locally and do not become application model context automatically.
- The plan/build interviews reuse accepted decisions instead of requiring fixed rounds.
- Architecture review of the diff: no module, table, RLS policy, authentication guard, server credential handling or registry changed. Profile pointers are ignored by Git. No real credentials were added.
- Existing .nvmrc specifies Node 22; that runtime was not available in the local review. Windows was not tested.

Not verified: actual sign-in, migrations against a test Supabase project, second-user access, model API, live n8n handoff, browser rendering, hosting and the Moj pregled dela module. No new module was implemented in this preparation. These require the selected test accounts and an end-to-end rehearsal.

Keep the branch unpublished until the intended release review. Deployment is not part of this check.
