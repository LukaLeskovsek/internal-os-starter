---
name: integrate-ai
description: Add AI to a module — a server-side LLM call via lib/ai.ts. Use when the user says "/integrate-ai", "add AI", "make it summarize/draft/classify/answer", or wants an LLM inside a module. Models on the ai_assist module.
---

When invoked, add one AI capability to a module the smallest useful way, server-side, storing results in the module's own prefixed RLS table. The `ai_assist` module is the worked example — imitate it.

## Ask first (don't invent)
1. **Which module, and what should the AI do?** (answer, summarize, draft, classify…)
2. **What's the input** (a form field, or the module's own data — e.g. `crm_demo` contacts) and **where does the output show**?

## The pattern (imitate ai_assist)
1. If it's a new module, `/scaffold-module` first.
2. **Build the prompt** — a clear `system` line + the input. To ground it in the company's data, pull from **this module's** tables/clients only (never another module's) and include it in the prompt.
3. **Call `generate({ system, prompt })`** from `lib/ai.ts`, inside the module's Server Action — **never** a client component.
4. **Store the result** in a `<module>_*` prefixed table with **RLS in the same migration**; `npm run db:run`.
5. **Render it.** Re-check `userCanAccess` in the action (a member can't drive a module they lack).

## Rules
- **Server-only.** `OPENROUTER_API_KEY` never reaches the browser, never `NEXT_PUBLIC_`, never in code.
- **Mock-mode is fine.** No key → `lib/ai.ts` returns canned output; the module still works (zero spend).
- **Cost + safety.** The key is capped. Small `max_tokens`, one call per action, no loops.
- **Module boundaries hold.** AI doesn't get to cross them — read only this module's data. Run `/check-architecture` after.
- **Model.** Default Claude via OpenRouter (`OPENROUTER_MODEL`); swap the slug for another provider.
- End by offering: *"Ready? `/verify` it (incl. the member/owner access check)."*
