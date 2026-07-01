---
module: travel_orders
title: Potni nalogi
status: verified
created: 2026-06-30
by: Luka Leskovšek
verified_runs: 1
live_url:
---

# Potni nalogi

## Goal
Vneseš službeno pot (stranka, relacija, km, čas) in modul samodejno izračuna
povračilo kilometrine.

## What it does (input → process → output)
- **Input:** uporabnik vnese pot — stranka (prosto besedilo), datum, relacija
  (od–do, besedilo), prevoženi km (ročno), čas (ročno).
- **Process:** modul izračuna povračilo `amount = km × rate`, kjer je `rate`
  konstanta **0,43 €/km** (SLO uredba), kasneje urejiva.
- **Output:** shranjena vrstica potnega naloga z izračunanim povračilom,
  prikazana v seznamu uporabnika s **skupno vsoto** povračil.

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
   se shrani; pot se pojavi v seznamu s tekočo skupno vsoto (toast prek `?ok=`).
2. Skupna vsota povračil se pravilno sešteje čez vse poti uporabnika.
3. Uporabnik brez podeljenega modula `travel_orders` modula ne vidi in nima
   dostopa (zavrnjeno strežniško).

## Out of scope
- Slice 2 (auto-razdalja iz naslovov prek zemljevidnega API-ja) — ne v prvi verziji.
- Stranka iz CRM (cross-module branje je prepovedano) — zaenkrat prosto besedilo.
- Urejiva stopnja, PDF izvoz, odobritveni korak, večuporabniško deljenje poti.
