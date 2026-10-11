---
module: invoice_ocr
title: Računi
status: built
pattern: pregledna-vrsta
created: 2026-10-11
by: Luka Leskovšek
verified_runs: 0
live_url:
---

# Računi

## Job & moment
Računovodstvo enkrat na teden za mizo potrdi kup prejetih računov za plačilo; ročnega
prepisovanja ne sme biti.

## Done for the person
Vsi računi so potrjeni ali zavrnjeni (z razlogom), popravki so shranjeni, potrjeni so
izvoženi za plačilo.

## Primary action
**Naloži račune** (bližnjica N) — ploščica Domov in ⌘K, odpre `?nov=1` (izpostavi polje za spust).

## Tile line
„3 računi čakajo na pregled" (pozornost) ali „Vse pregledano".

## Flow (fewest steps)
1. Spusti več datotek kamorkoli na stran — AI jih prebere (do 3 hkrati), vrstice „Berem…".
2. „Začni pregled" → stran pregleda: original ob **urejenih, predizpolnjenih** poljih,
   prazna polja označena, preverba neto + DDV = skupaj, značka „Možen dvojnik".
3. **A** = shrani popravke + potrdi + naslednji; **R** = razlogi (čipi) + zavrni; J/K premik.
**Klikov na račun:** 1 tipka (prej ~6 klikov).

## Data stored
`invoice_ocr_invoices` (owner-all RLS): datoteka v shrambi (mapa uporabnika), dobavitelj,
številka, datumi, valuta, zneski, status `pending/approved/rejected`, komentar, surovi
izpis modela. `invoice_ocr_line_items`: postavke računa.

## Access
Modul `invoice_ocr` se podeli v Administraciji. Vsak vidi le svoje račune.

## AI
- **Capability:** extract (račun → polja + postavke), `modules/invoice_ocr/lib/ocr.ts`.
- **Human checkpoint:** stran pregleda — vsako polje je urejeno pred potrditvijo; nič se ne potrdi samo.
- Brez ključa: „Demo branje" z vzorčnim računom.

## Done when
1. Trije spuščeni računi se preberejo in čakajo v „Za pregled (3)".
2. A potrdi in skoči na naslednjega; popravljeno polje ostane shranjeno po osvežitvi.
3. R z razlogom zavrne; prazna vrsta pokaže „Vse pregledano" z izvozom.
4. CSV se v slovenskem Excelu odpre v stolpcih (`;`, decimalna vejica, slovenski statusi).
5. Uporabnik brez modula nima dostopa (stran, akcije, nalaganje, izvoz).

## Out of scope
Povezava z računovodskim programom, plačilni nalogi, odobritev v več korakih.
