---
name: debug
description: Find and fix the real cause when something breaks — without thrashing. Use when the user says "/debug", "it's broken", "this error", pastes an error, or after a failed /verify.
---

When invoked, work the problem methodically. The enemy is guessing and changing many things at once.

## Steps
1. **Reproduce** the exact failure — what action, what you expected, what actually happened.
2. **Read the real error** — don't paraphrase from memory. Get the actual text from:
   - the dev server or `npm run build` output, or
   - the **Vercel build log** (for a failed deploy), or
   - **Sentry** (for a live runtime error — it's already captured there), or
   - the browser console.
3. **Isolate** — narrow to the smallest cause. Form one hypothesis; change **one** thing.
4. **Fix** that one thing, then re-run `/verify`.

## Known traps in this repo (check these first)
- **Page shows stale or half-built output after `npm run build`:** a build ran while `npm run dev` was running — both write `.next`. Stop dev, `rm -rf .next`, start dev again.
- **Dev server rebuilding every second, high CPU, saves that never arrive:** something is writing files into the repo (tool logs, reports). Make sure the folder is ignored in `next.config.ts` (`watchOptions.ignored`) and in `app/globals.css` (`@source not`).
- **AI answers are a "Demo odgovor" / invoices read as the sample:** no `OPENROUTER_API_KEY` and `AI_BACKEND` isn't `local-claude` (or `claude` isn't logged in) — the server log says which (`[ai] …`).
- **A module or its tile is missing / "Do tega orodja nimaš dostopa":** the module's migration wasn't run, or the user isn't granted it in Administracija → Dostopi, or it's switched off in Orodja.

## Rules
- One variable at a time. If you change five things and it works, you've learned nothing.
- **Two failed attempts → STOP and reset:** restate the current state, the goal, and the problem; shrink to the smallest next step; try again. Don't spiral.
- Never disable a safety rail (RLS, auth, env-only secrets) just to "make it work."
- Paste the *actual* error to reason from — never debug from a remembered description.
- **If a change made it *worse* than a working state, go back — don't dig forward.**
  `git revert` to the last good commit (it adds a new commit that restores the working
  state; never `git reset --hard` or `git push --force`), then re-verify from there.
