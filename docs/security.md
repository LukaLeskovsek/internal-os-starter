# Security Notes

## Admin bootstrap

Public signup always creates a `member` with no module grants. The initial owner is
created by:

```bash
ADMIN_EMAIL=founder@example.com npm run seed:admin
```

It opens a one-time password link in the browser (`-- --print` prints it instead; treat
it as a credential). Press Nadaljuj, set the password, then manage users and tools in
Administracija.

## AI daily budget

Real OpenRouter calls are capped per signed-in user by `AI_DAILY_LIMIT_PER_USER`
(default `20`). Mock mode does not consume budget when `OPENROUTER_API_KEY` is blank.
The database records usage through a locked RPC, so parallel requests cannot all
pass the same budget check.

## Dependency review 2026-10-10

The local workshop preparation updates Next and eslint-config-next to 15.5.27,
PostCSS to 8.5.29 and @tailwindcss/postcss to 4.3.3, with compatible lockfile updates.
Lint and production build pass on Node 24.18.0. The repository recommends Node 22;
that runtime and live Supabase authentication have not been tested in this review.

The final npm audit reports **0 critical, 10 high and 1 moderate** findings. The
security check remains failing; this is not a release-ready security result.
Two dependency families account for the remaining high findings:

- Next still includes PostCSS 8.4.31 internally. Updating the top-level PostCSS does
  not replace it. See [PostCSS advisory](https://github.com/advisories/GHSA-r28c-9q8g-f849).
- braces and its dependency chain affect build/lint/component tooling. The audit
  lists all braces versions as affected. See [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

Do not silence the check or run force fixes blindly. Before deployment, validate a
patched dependency path, repeat installation, lint, build and audit, then test
login and the intended module in the target environment. The Edge runtime warning
from Supabase also needs target-environment verification; a successful build does
not prove authentication works.

The workshop uses OpenRouter for any application model calls. The optional
local-claude backend is outside the workshop's hosted or multi-user setup; do not
expose it to other users as part of this preparation.
