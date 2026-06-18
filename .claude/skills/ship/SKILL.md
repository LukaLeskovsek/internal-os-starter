---
name: ship
description: Close the loop — get the verified change live and confirm it actually works in production. Use when the user says "/ship", "deploy", "push it live", or after a passing /verify.
---

When invoked, get the change to a working public URL — and **confirm** it, don't assume it.

## Steps
1. Confirm `/verify` passed. If not, stop — `/debug` first.
2. Risky change? Do it on a **branch** first: push the branch → Vercel mints a **preview URL** → check there before merging.
3. Commit + push to `main`. Vercel deploys `main` to production (~1 min).
4. **Confirm the LIVE url:** open the production URL and check it loads (not a login/401 page), sign-in works, and the feature works.
5. **Public check:** if the URL shows a Vercel login / "Authenticate" page, Deployment Protection is on → *Vercel → Settings → Deployment Protection → turn off **Vercel Authentication*** so your pair can open it.
6. Report the live URL.

## Rules
- Production = `main`. Don't push broken code to `main` — that's what preview URLs are for.
- Secrets live in Vercel env + `.env.local` only — never commit them.
- "Shipped" means you opened the live URL and it worked — not "the deploy finished."
