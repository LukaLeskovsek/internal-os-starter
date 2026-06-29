---
module: work_orders
title: Delovni nalogi
status: planned
created: 2026-06-29
by: Luka Leskovšek
verified_runs: 0
live_url:
---

# Delovni nalogi

## Goal
Interno orodje, kjer pisarna ustvari in dodeli delovni nalog, izvajalec pa ga na
telefonu vidi in premika skozi statuse do zaključka (ob zaključku nazaj v Zoho).

## What it does (input → process → output)
- **Input:** pisarniški uporabnik vnese nalog — stranka (izbrana iz Zoho CRM,
  read-only po vzoru [[intrix]]), naslov, opis, dodeljen izvajalec.
- **Process:** nalog se shrani v Supabase (`work_orders_orders`) s statusom
  `odprt`; izvajalec ga na mobilnem premika `odprt → v_delu → zakljucen`.
- **Output:** vrstica naloga, vidna ustvarjalcu in dodeljenemu izvajalcu (RLS).
  Ob zaključku se nalog zapiše nazaj v Zoho — **človek potrdi pred pošiljanjem**
  (slice 3, zahteva odobritev lastnika).

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
   `odprt → v_delu → zakljucen`; spremembe se shranijo (toast prek `?ok=`).
3. Uporabnik brez podeljenega modula `work_orders` modula ne vidi in nima dostopa.

## Out of scope
- Slice 3 (write-back v Zoho) — ne v prvi verziji.
- Priloge/fotografije, podpis stranke, push obvestila, offline način.

## Open / risks
- Izbirnik izvajalca potrebuje seznam uporabnikov → branje `core_profiles` (id+email)
  v Server Action; nikoli admin-client v client komponenti.
- Prilagojen RLS (ustvarjalec ALI dodeljeni) — preveri pri `/verify`.
