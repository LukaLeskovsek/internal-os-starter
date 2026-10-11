---
module: travel_orders
title: Potni nalogi
status: built
pattern: hitri-vnos
created: 2026-06-30
by: Luka Leskovšek
verified_runs: 1
live_url:
---

# Potni nalogi

## Job & moment
Zaposleni takoj po obisku stranke (pogosto na telefonu, v avtu) zabeleži pot v nekaj
sekundah; konec meseca potrebuje km in € za povračilo kilometrine.

## Done for the person
Pot je zapisana, mesec ima pravilno vsoto km in povračila, ki jo lahko odda.

## Primary action
**Nova pot** (bližnjica N) — gumb na ploščici Domov in v ⌘K, odpre `?nov=1`.

## Tile line
„412 km · 177,16 € ta mesec" ali „Ta mesec še ni poti".

## Flow (fewest steps)
1. Ponovi pot (ista relacija, danes) — **1 klik**, z „Razveljavi".
2. Nova pot iz nedavne relacije: N → čip relacije (izpolni od, do, km, stranko) → Enter — **3**.
3. Popolnoma nova pot: „Od" je že najpogostejši začetek, datum je danes; vpišeš „Do"
   in km; „Povratna pot" podvoji km; povračilo se kaže sproti — **~5**.
Uredi / Izbriši sta v meniju vrstice; brisanje se da razveljaviti.

## Data stored
`travel_orders_trips` (owner-all RLS): stranka, datum, od, do, km, odhod/prihod,
`rate` (shranjena ob vnosu, 0,43 €/km), `amount` = km × rate (izračuna strežnik).

## Access
Modul `travel_orders` se podeli v Admin. Lastnik + kdor dela potne naloge.
Member vidi samo podeljene module.

## Slices
- **Slice 1 (prvi):** modul + tabela `travel_orders_trips` (+ RLS: owner-all) +
  obrazec za ročni vnos + samodejni izračun (km × 0,43) + seznam s skupno vsoto.
- **Slice 2:** samodejna razdalja + čas iz naslovov prek zemljevidnega API-ja
  (`/integrate-api`, ko bo ključ na voljo) — vpišeš naslova, sistem vrne km/čas.
- **Slice 3 (možno):** urejiva stopnja kilometrine, filtri po obdobju, PDF izvoz.

## Zemljevidni API (odločitev)
- Ključa **še ni**, zato prvi rez = **ročni vnos km**. Auto-razdalja je ločen
  rez (slice 2) prek `/integrate-api`, po vzoru `modules/crm_demo/lib/intrix.ts`:
  `fetch` na strežniku, ključ iz `process.env`, mock fallback. Read-only klic.

## Done when
1. Uporabnik ustvari pot z ročnimi km → povračilo se izračuna pri 0,43 €/km in
   se shrani; pot se pojavi v mesecu, glava kaže vsoto km in € (toast „Pot shranjena.").
2. „Ponovi" ustvari isto pot z današnjim datumom; „Razveljavi" jo odstrani.
3. Ponovitev poti = 1 klik, nova pot iz nedavne relacije ≤ 3 na telefonu.
4. Prazen mesec pokaže prijazno prazno stanje z „Nova pot"; svetla in temna tema delujeta.
5. Uporabnik brez podeljenega modula `travel_orders` modula ne vidi in nima
   dostopa (zavrnjeno strežniško).

## Out of scope
- Slice 2 (auto-razdalja iz naslovov prek zemljevidnega API-ja) — ne v prvi verziji.
- Stranka iz CRM (cross-module branje je prepovedano) — zaenkrat prosto besedilo.
- Urejiva stopnja, PDF izvoz, odobritveni korak, večuporabniško deljenje poti.
