---
name: verify
description: Prove the change actually works for the person — walk the real flow, count the clicks, check both themes and phone size, and check access control. Use when the user says "/verify", "does it work", "test it", or after /build. Reports concrete pass/fail.
---

When invoked, don't *say* it works — *show* it. Run the app, walk the Card's flow as the person would, check access control, and report what you observed.

## Steps
1. `npx tsc --noEmit && npm run lint` — must be green. (`npm run build` only with `npm run dev` stopped.)
2. Run `/check-architecture` — prefixes, RLS present, `moduleContext` in every action, no cross-module imports, no hardcoded secrets, registry consistent.
3. Run the app (`npm run dev`, or the deployed URL) and **walk the Card's Flow**:
   - Home shows the module's tile with its **tile line** and **primary action**; the button (and ⌘K) opens the create sheet directly.
   - Do the main job end to end. **Count the clicks** and compare with the Card's budget.
   - Refresh: the result is still there. An incomplete entry is refused with a clear Slovenian message under the field.
   - The empty state appears when there is nothing, and offers the next step.
4. **Look at it** at 1440 px and at phone width (390 px), in **light and dark** mode. Screenshot each. Check: no raw ISO dates, no English or developer words, nothing cut off on the phone, the primary action reachable with a thumb.
5. **Access-control checks (the heart of this app):**
   - As the **owner**, grant a **member** exactly one module in Administracija.
   - As that member, confirm Home and ⌘K show **only** that module, and visiting an **ungranted** module's URL is **refused**.
   - Confirm the member **cannot** use the module's actions after the grant is removed, and cannot reach Administracija.
6. Report a checklist of ✓ / ✗ with what you actually saw — not "should work".
7. **Save the evidence.** Append `docs/features/<moduleId>/runs/<YYYY-MM-DD-HHMM>-verify.md` with the ✓/✗ checklist, the click count and the screenshot list, and a PASS/FAIL verdict (format in `docs/features/README.md`). On all-✓, set the Card's `status: verified` and bump `verified_runs` by 1 — that counter is the gate before you treat the module as trusted.

## Rules
- "Works" means you ran it and watched it happen — including the member's restricted view and the phone layout.
- More clicks than the Card's budget is a ✗: go back to `/build` and remove steps (defaults, prefill, chips).
- Any ✗ → hand to `/debug`. Don't ship a failing build or a broken access check.
- All ✓ → suggest *"`/ship` it."*
