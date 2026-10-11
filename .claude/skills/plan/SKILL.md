---
name: plan
description: Shape a feature idea into a small, ordered build plan before any code, starting from the person's job, not the database. Use when the user says "/plan", "plan this", "I want to add…", or describes a feature or change. Writes no code.
---

When invoked, turn the user's idea into the smallest sensible plan — then stop. Do not write code; `/build` does that.

The plan starts from **the person and the moment**, never from a table. "Table → form → list" is the wrong default; it gives people a database editor instead of a tool. Read `docs/ux-patterns.md` before you start.

## Clarify what is missing
First read the handoff, saved decisions and confirmed profile from CLAUDE.md. Reuse answers already given. Ask one missing question at a time. Do not require a fixed number of rounds. Ask in this order and skip what is already clear:

1. **Job & moment:** who uses it, when, where (desk, car, phone in the field), how often? What just happened that makes them open it?
2. **Done for the person:** what does "finished" look like for them — a saved entry, a decision, a handover, an answer?
3. **Pattern:** which pattern from `docs/ux-patterns.md` fits — Hitri vnos, Pregledna vrsta, Dodeljevanje, Iskanje, Vprašaj? Propose one; confirm.
4. **Fewest-input flow:** walk the steps. For every field ask *can we prefill, default, derive or remember it instead?* (today's date, last value, most frequent value, the current user, what AI can read from a file). Count the clicks on a phone.
5. **Primary action & tile line:** the one button on the Home tile and in ⌘K, and the one-line status the tile shows ("3 čakajo na pregled").
6. **Who:** who should see this module? (members see only granted modules)
7. **Data — last:** only what the flow needs. Which `<id>_*` table(s), which columns, which RLS (owner only, or creator-or-assignee)?
8. **Not now:** what's explicitly out of scope for the first version?

Stop when you have enough for a real first slice. Then **reflect it back in one line — "<kdo, kdaj> → <klik> → <rezultat>" — and get a "yes"** before writing the plan. Never guess a missing fact — ask.

## Read for context
`CLAUDE.md` (the four rules, the Design & UX rules, the module contract), `docs/ux-patterns.md`, `docs/architecture.md`, and `PERSON.md` / `COMPANY.md` / `BRAND.md` if present.

## Output — a short plan, no code
- **Job & moment:** one sentence, in the user's words.
- **Pattern + reference module:** e.g. *Hitri vnos → imitate `travel_orders`*.
- **Flow:** the numbered steps with what is prefilled, and the click count.
- **Primary action / tile line.**
- **Module:** which module this belongs to. A new tool is a **new module** — plan to run `/scaffold-module`, never to hand-create folders.
- **First slice:** the smallest end-to-end piece the person could actually use (aim: done in one sitting). The first slice is the primary action working end to end, not "the table".
- **Steps:** 3–6 ordered bullets — what changes and where (which `modules/<id>/` files).
- **Data:** the prefixed table(s) with RLS in the same migration.
- **Access / Done when / Out of scope.**

## Artifact (write the plan down)
After showing the plan, **write it to `docs/features/<moduleId>/feature.md`** — the Feature Card (format in `docs/features/README.md`): Job & moment, Done for the person, Primary action, Tile line, Flow, Data stored, Access, Done when, Out of scope, `pattern:` and `status: planned`. If `/scaffold-module` already created the Card, update it in place — don't duplicate.

## Rules
- Keep it to one screen. Long plan = slice too big — cut it.
- A plan never touches `app/login/`, `lib/` security helpers, or another module's folder.
- Every field the person types must earn its place. If it can be derived or defaulted, it is not a field.
- End by offering: *"Ready? `/build` the first slice."*
