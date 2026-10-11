---
module: work_orders
title: Delovni nalogi
status: built
pattern: dodeljevanje
created: 2026-06-29
by: Luka Leskovšek
verified_runs: 0
live_url:
---

# Delovni nalogi

## Job & moment
Pisarna v 15 sekundah pošlje delo pravi osebi; izvajalec na terenu na telefonu vidi
svoje naloge in jih z enim dotikom premakne do zaključka.

## Done for the person
Pisarna: nalog je dodeljen in viden. Teren: nalog je zaključen, pisarna to vidi.

## Primary action
**Nov nalog** (bližnjica N) — gumb na ploščici Domov in v ⌘K, odpre `?nov=1`.

## Tile line
„2 odprta naloga zate" (pozornost) ali „5 odprtih nalogov" / „Ni odprtih nalogov".

## Flow (fewest steps)
1. Teren: odpre modul → privzet filter „Moji" → „Začni" / „Zaključi" na vrstici — **1 dotik**, z „Razveljavi".
2. Pisarna: N → naslov → Enter — **~3**. Stranka: nedavne najprej (Zoho/demo), izvajalec:
   zadnji izbrani; opis je skrit za „Dodaj opis".
3. Podrobnosti v stranskem oknu (`?id=`): status, urejanje, predodelitev in brisanje (ustvarjalec).

## Data stored
`work_orders_orders` (RLS: ustvarjalec ali izvajalec): naslov, opis, stranka (Zoho id +
ime), izvajalec, status `odprt → v_delu → zakljucen`. Sodelavci prek `core_module_members()`.

## Access
Modul `work_orders` se podeli v Admin. Pisarna + izvajalci. Member vidi samo
podeljene module; admin grid (lastnik) odloča, kdo ima dostop.

## Zoho integracija (odločitev)
- **REST API, ne MCP.** Strežniška lib `modules/work_orders/lib/zoho.ts` po vzoru
  `modules/crm_demo/lib/intrix.ts`: `fetch` na strežniku, OAuth token iz
  `process.env`, mock fallback. Slice 1 = **branje** strank. Pisanje nazaj
  (slice 3) je ločeno in zahteva izrecno odobritev (read-before-write pravilo).

## Slices
- **Slice 1 (prvi):** modul + tabela `work_orders_orders` (+ RLS: ustvarjalec ALI
  dodeljeni) + Zoho branje strank + mobile-first kreiranje/seznam/detajl/status.
- **Slice 2:** izboljšave dodeljevanja in filtrov (npr. pogled "moji nalogi").
- **Slice 3:** zapis naloga/statusa nazaj v Zoho ob zaključku — zahteva odobritev.

## Done when
1. Pisarniški uporabnik ustvari nalog s stranko izbrano iz Zoho in ga dodeli izvajalcu.
2. Izvajalec (drug račun, mobilni viewport) vidi nalog med svojimi in ga premakne
   `odprt → v_delu → zakljucen` z enim dotikom na vrstici („Razveljavi" v toastu).
3. Premik statusa = 1 dotik na telefonu; nov nalog ≤ 3 koraki.
4. Uporabnik brez podeljenega modula `work_orders` modula ne vidi in nima dostopa.

## Out of scope
- Slice 3 (write-back v Zoho) — ne v prvi verziji.
- Priloge/fotografije, podpis stranke, push obvestila, offline način.

## Open / risks
- Izbirnik izvajalca: `listModuleMembers()` → `core_module_members()` (security definer,
  samo aktivni klicatelj z dodeljenim, vklopljenim modulom); nikoli admin-client.
- Predodelitev je samo za ustvarjalca (RLS WITH CHECK bi zavrnil izvajalca).
- Prilagojen RLS (ustvarjalec ALI dodeljeni) — preveri pri `/verify`.
