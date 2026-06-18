---
name: plan
description: Shape a feature idea into a small, ordered build plan before any code. Use when the user says "/plan", "plan this", "I want to add…", or describes a feature or change. Writes no code.
---

When invoked, turn the user's idea into the smallest sensible plan — then stop. Do not write code; `/build` does that.

## Ask first (don't invent)
If the idea is vague, ask up to **2** short questions (What should it do for the user? Who should be able to see it?). If a fact is missing, ask — never guess.

## Read for context
This repo's `CLAUDE.md` (the four rules), `docs/architecture.md`, and `PERSON.md` / `COMPANY.md` / `BRAND.md` if present.

## Output — a short plan, no code
- **Goal:** one sentence, in the user's words.
- **Module:** which module this belongs to. A new tool is a **new module** — plan to run `/scaffold-module`, never to hand-create folders.
- **First slice:** the smallest end-to-end piece worth seeing work (aim: done in one sitting).
- **Steps:** 3–6 ordered bullets — what changes and where (which `modules/<id>/` files).
- **Imitate:** the `crm_demo` module is the model (list/detail; read-only external data via `modules/crm_demo/lib/intrix.ts`).
- **Access:** who gets this module (it's granted in Admin; remember a member sees only granted modules).
- **Done when:** how you'll know it works (the check `/verify` will run).
- **Out of scope:** what you are NOT doing now.

## Rules
- Keep it to one screen. Long plan = slice too big — cut it.
- A plan never touches `app/login/`, `lib/`, or another module's folder.
- New data = a **prefixed** table (`<moduleId>_*`) **with RLS in the same migration**; note that in the plan.
- End by offering: *"Ready? `/build` the first slice."*
