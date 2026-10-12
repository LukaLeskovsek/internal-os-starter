---
module: core-ai
title: Preverjeni lokalni Claude in objava brez obveznega AI
status: built
pattern: shared-infrastructure
created: 2026-10-12
verified_runs: 0
---

# Lokalna aplikacija uporablja preverjeno naročniško prijavo

Uporabnik razvija aplikacijo na svojem računalniku. Manjkajoča nastavitev ali napaka ne sme sprožiti plačljivega API-ja. Besedilo in datoteke uporabljajo isto izbiro; lokalni AI se na Vercelu zavrne. Objavljena aplikacija lahko deluje brez AI.

Pot: priprava okolja → preverba izbire in naročniške prijave → lokalni rezultat → jasen odziv ob napaki → ločena priprava OpenRouterja za objavo, z omejitvami porabe.

Sprejeti načrt dovoljuje ozko spremembo skupnih AI-pomočnikov in dveh obstoječih porabnikov (besedilo in OCR). Dostopni pogoji, shema in obstoječe migracije ostanejo enaki. Poslovne vloge in shranjevanje preverimo ločeno; lokalni testi niso dokaz žive Supabase prijave dveh uporabnikov.

Pripravljeno, ko: ni nenamernega prehoda na API, prijava je preverjena pred klicem, napaka ne ustvari navideznega rezultata, dnevni proračun velja samo za izbrano uporabo API-ja, navodila in preverjanja so usklajena.

Objava, novi računi, spremembe v produkcijski bazi in obsežna odprava odvisnosti niso del te spremembe.
