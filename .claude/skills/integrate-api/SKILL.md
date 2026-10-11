---
name: integrate-api
description: Add a read-only external API integration to a module, modeled on the Intrix reference. Use when the user says "/integrate-api", "connect an API", or wants a module to pull data from an external service.
---

When invoked, add a server-side API client to an existing module — read path first.

## Ask first (don't invent)
1. Which **module** this belongs to (it must already exist — run `/scaffold-module` first if not).
2. The API **base URL** and the **env var name** for its key (e.g. `ACME_API_KEY`, `ACME_BASE_URL`).
3. (Optional) a docs or OpenAPI URL to ground the request/response shape.

## Steps
1. Add the env var(s) to `.env.example` with a comment. Never hardcode the key.
2. Create `modules/<id>/lib/<service>.ts`: a server-side typed `fetch` using `process.env.<KEY>`, `cache: "no-store"`, **with a mock-mode fallback** — if the key is empty, serve bundled fixtures and return `mock: true`. Copy `modules/crm_demo/lib/intrix.ts`.
3. Use the data **inside the person's flow**, not on a separate screen: an external pick-list becomes a `Combobox` in the create sheet with recent items first; a lookup becomes searchable rows with the action on the row (see `crm_demo`). When `mock` is true show a "Demo podatki" badge — never developer text, env-var names or skill names.
4. **Never call the external API from `summary.ts`** — the Home tile must stay fast. Return `null` or a count from the module's own tables.
5. **Read before write.** Writing back to the external API needs explicit owner approval in the spec — do not add write calls by default.

## Rules
- Server-side only — the key never reaches the browser.
- Mock mode must work with the key removed (it's the workshop fallback).
- After integrating, run `npx tsc --noEmit && npm run lint`, then `/check-architecture`.
