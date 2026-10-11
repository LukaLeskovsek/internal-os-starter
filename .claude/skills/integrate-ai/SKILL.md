---
name: integrate-ai
description: Add AI to a module — a server-side LLM call via lib/ai.ts. Use when the user says "/integrate-ai", "add AI", "make it summarize/draft/classify/answer", or wants an LLM inside a module. Models on the ai_assist module.
---

When invoked, add one AI capability to a module the smallest useful way, server-side, storing results in the module's own prefixed RLS table. AI should **remove typing and decisions from the person's flow**, not add a new screen to visit. Worked examples: `ai_assist` (ask → answer) and `invoice_ocr` (file → AI extracts → the person corrects and approves).

## Ask first (don't invent)
1. **Which module, and what should the AI do?** (answer, summarize, draft, classify…)
2. **Which step of the person's flow does it shorten?** (e.g. "fills the invoice fields from the PDF", "drafts the reply") What goes in, and **where does the person see and confirm the result**?

## The pattern (imitate ai_assist)
1. If it's a new module, `/scaffold-module` first.
2. **Build the prompt** — a clear `system` line (in Slovenian when the answer is shown to people) + the input. To ground it in the company's data, pull from **this module's** tables/clients only (never another module's) and include it in the prompt.
3. **Call `generate({ system, prompt })`** from `lib/ai.ts`, inside the module's Server Action — **never** a client component.
4. **Store the result** in a `<module>_*` prefixed table with **RLS in the same migration**; `npm run db:run`.
5. **Render it as a draft the person controls.** AI output that changes data appears **prefilled and editable**, with approve / reject — never applied silently. Show a pending state while it runs ("Berem…", "Razmišljam…"). In mock mode show a friendly "Demo način" badge, not developer text. The action starts with `moduleContext("<id>")` (a member can't drive a module they lack) and returns `ActionResult`; the daily limit error becomes `sl.errors.aiLimit`.
6. **Record the prompt.** Write the capability and the **exact `system` + input** you used into the **AI** section of `docs/features/<moduleId>/feature.md` (format in `docs/features/README.md`), and append a `runs/<YYYY-MM-DD-HHMM>-integrate-ai.md` evidence file. The prompt living in the Card means the founder can read and tweak the behaviour, then re-run this skill.

## Rules
- **Server-only.** `OPENROUTER_API_KEY` never reaches the browser, never `NEXT_PUBLIC_`, never in code.
- **Mock-mode is fine.** No key → `lib/ai.ts` returns canned output; the module still works (zero spend).
- **Cost + safety.** The key is capped. Small `max_tokens`, one call per action, no loops.
- **Module boundaries hold.** AI doesn't get to cross them — read only this module's data. Run `/check-architecture` after.
- **Model.** Default Claude via OpenRouter (`OPENROUTER_MODEL`); swap the slug for another provider.
- **Backend (one env var, no code change).** `generate()` honours `AI_BACKEND`: leave it `openrouter` (pay-as-you-go) for deployed, or set `AI_BACKEND=local-claude` in `.env.local` to offload to your **local Claude subscription** via `claude -p` (no key, no per-token spend) while building locally. Same `generate()` call either way — never add a second AI path.
- End by offering: *"Ready? `/verify` it (incl. the member/owner access check)."*
