# UX patterns: pick one before you build

Every module in this app does **one job** for **one person at one moment**. Most jobs fit
one of five patterns. Pick the pattern first, then copy its reference module. The
database comes last: store what the flow needs, nothing more.

| Pattern | The person wants to… | Reference module | Click budget |
|---|---|---|---|
| **Hitri vnos** (quick entry) | record something that just happened | `travel_orders` | 1 (repeat) to 5 (new) |
| **Pregledna vrsta** (review queue) | go through a pile and decide each item | `invoice_ocr` | 1 key per item |
| **Dodeljevanje** (dispatch) | hand work to someone and track it to done | `work_orders` | 2 to create, 1 per status |
| **Iskanje** (lookup) | find one thing fast and act on it | `crm_demo` | 0 to call / mail |
| **Vprašaj** (ask) | get an answer or a draft from AI | `ai_assist` | type + Enter |

Admin (`admin`) is the reference for **settings**: tabs, switches that save instantly.

## The questions that pick the pattern

1. **Who** uses it, **where** (desk, car, phone in the field), and **how often**?
2. **What triggers it?** Something happened (→ quick entry), a pile arrived (→ review
   queue), someone must do something (→ dispatch), a question came up (→ lookup / ask).
3. **What does done look like for them?** A saved entry, a decision, a handover, an answer.
4. **What can we prefill?** Today's date, the last value, the most frequent value, the
   current user, data the AI can read from a file.

## Hitri vnos: quick entry (`travel_orders`)

When: the person records the same kind of thing again and again (a trip, an hour, a
visit, an expense).

- The list shows **this period** (month) with totals in the header; ‹ › moves periods.
- **"Ponovi"** on a row creates the same entry dated today: one click, with undo.
- **"+ Nova …"** (N) opens a `FormSheet`. Recent values are chips that fill several fields
  at once; defaults come from the person's own history; optional fields are collapsed.
- Derived values (amount = km × rate) are shown live and recomputed on the server.
- Edit and delete live in the row menu.

## Pregledna vrsta: review queue (`invoice_ocr`)

When: items arrive in batches and each needs a human decision (approve invoices, check
timesheets, moderate requests).

- Tabs **Za pregled (n)** / **Obdelano**; the Home tile shows the queue size.
- Intake is as lazy as possible: drop many files at once; AI reads them.
- The review page shows the source next to **editable, prefilled** fields; uncertain
  fields are highlighted; sanity checks (sums, duplicates) are shown, not hidden.
- One sticky bar: **Zavrni (R)** / **Potrdi in naprej (A)**; J/K move through the queue.
  Deciding saves corrections + decision in one action and jumps to the next item.
- An empty queue celebrates and offers the next step (export).

## Dodeljevanje: dispatch (`work_orders`)

When: one person creates work, another does it, both track the state.

- Filter chips **Moji · Odprti · V delu · Zaključeni**; the default is what the person
  most likely needs (their own open items).
- Each row has the **next step as a button** ("Začni", "Zaključi"): one tap, with undo.
- Create sheet: title first, pickers with recent values first, assignee defaults to the
  last one used. Colleagues come from `listModuleMembers()`.
- Detail sheet: edit inline, reassign, change status, delete (creator only).

## Iskanje: lookup (`crm_demo`)

When: the person needs one fact (a phone number, an address, a price) right now.

- The search box is focused on arrival; results filter as you type.
- Rows carry the actions (call, mail, copy) so the job is done without opening anything.
- Detail opens in a sheet; external data shows "Demo podatki" when it's sample data.

## Vprašaj: ask (`ai_assist`)

When: the person wants a short answer or a draft to paste somewhere.

- Chat layout, composer pinned at the bottom, Enter sends.
- The question appears immediately; a "Razmišljam…" bubble shows the AI is working.
- Every answer has "Kopiraj". The empty state offers a few example questions.
- AI output that changes data is never applied silently: show it as an editable draft
  with approve / reject (see `invoice_ocr`).

## Building blocks (all in `components/app/`)

`PageHeader` (title, the job, primary action; sticky on phones) · `EmptyState` ·
`DataList` + `ListRow` + `ListHeading` · `FormSheet` (create/edit) · `DetailSheet`
(`?id=`) · `ActionForm` + `Field` · `StatusBadge` + `ToneDot` · `FilterChips` (`?f=`) ·
`Info` / `InfoGrid` · `KbdHint`. Hooks: `useHotkey`, `useActionToast`.
Formatting: `lib/format.ts`. Shared copy: `lib/i18n/sl.ts`.
