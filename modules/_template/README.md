# Module template (quick-entry pattern)

`/scaffold-module` copies this folder to `modules/<id>/` and renames it. It is NOT
registered and not routed, so it never appears in the app. Read it to see the
smallest complete module that follows the design & UX rules:

| File | What it is |
|---|---|
| `pages.tsx` | Server component: loads the person's data, renders header, list, empty state. |
| `item-sheet.tsx` | The create / edit sheet (`FormSheet`) with recent-value chips. |
| `item-row.tsx` | Row buttons: "Ponovi" and a menu with Uredi / Izbriši, all undoable. |
| `actions.ts` | Server Actions: `moduleContext` first, zod, own table, `ActionResult`. |
| `strings.ts` | Every word the person reads, in Slovenian. |
| `summary.ts` | The one-line status on the Home tile. |
| `db/0001_template.sql` | Register + grant owners + prefixed table with RLS. |

Rename everywhere: `template` → your id, `Template` → your component name,
`template_items` → `<id>_<noun>`. The full reference with more tricks (month view,
derived amounts, round trips) is `modules/travel_orders`.
