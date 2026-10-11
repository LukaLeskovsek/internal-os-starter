# Adding a module

A module is a tool that does **one job for one person at one moment**. Start from that
job, not from a table. The supported way is **`/plan`** then **`/scaffold-module`** —
don't hand-create folders. The skills keep the rails (prefixes, RLS, registry, router,
access checks) and the design rules in place for you.

## 1. Job and flow first

Answer, in this order (`/plan` asks you):

1. **Who, when, where?** "Terenec na telefonu, takoj po obisku."
2. **What does done look like for them?** "Nalog je zaključen in pisarna to vidi."
3. **Which pattern?** Pick one in [`ux-patterns.md`](ux-patterns.md): Hitri vnos,
   Pregledna vrsta, Dodeljevanje, Iskanje or Vprašaj. Each has a reference module.
4. **The fewest-input flow.** For every field: can we prefill, default, derive or
   remember it instead? Count the clicks on a phone.

The answers go into the Feature Card `docs/features/<id>/feature.md`.

## 2. Scaffold

`/scaffold-module` asks for the id (lowercase, it becomes the table prefix), the name,
the job sentence, the primary action and the pattern, then creates:

- an entry in `modules/_registry.ts` — `name`, `description` (the job), a lucide `icon`,
  `primaryAction` (`/m/<id>?nov=1`), `summary`;
- `modules/<id>/` copied from `modules/_template/`: `pages.tsx`, client components,
  `actions.ts`, `strings.ts` (Slovenian copy), `summary.ts` (the Home tile line),
  `db/0001_<id>.sql`;
- a `case` in `app/(app)/m/[module]/page.tsx`;
- the Feature Card.

## 3. Primary action and tile line

- The **primary action** is the one thing people come for. It is the button on the Home
  tile, an entry in ⌘K, the shortcut **N**, and it opens the create sheet (`?nov=1`).
- The **tile line** (`summary.ts`) tells people whether they need to open the tool at all:
  "3 čakajo na pregled", "412 km ta mesec". One cheap query on your own table.

## 4. Storage — only what the flow needs

Put a migration in the module's `db/` folder. Every table name **must** start with the
module id, and RLS goes in the same file:

```sql
create table if not exists public.leads_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null,
  created_at timestamptz not null default now()
);
alter table public.leads_items enable row level security;
create policy "leads_items: owner all" on public.leads_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Run it with `npm run db:run -- modules/<id>/db/0001_<id>.sql`, then grant yourself the
module in **Administracija** (`/m/admin`).

## 5. Connecting an external API

Use **`/integrate-api`** — it copies the `crm_demo` Intrix pattern: a server-side client
reading from `process.env`, with a mock-mode fallback. Read before write. External data
belongs inside the flow (a picker in the create sheet), not on a separate screen.

## After any change

`npx tsc --noEmit && npm run lint`, then `/check-architecture`, then `/verify`.
