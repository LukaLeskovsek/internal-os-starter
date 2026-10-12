---
module: leave
title: Dopusti
status: shipped
pattern: hitri-vnos
created: 2026-10-11
by: Luka Leskovšek
verified_runs: 2
live_url: https://internal-os-starter-orpin.vercel.app
---

# Dopusti

## Job & moment
Vodja ali kadrovnica za mizo, ko jim zaposleni sporoči odsotnost, jo v nekaj sekundah
vnese za ekipo. Kadarkoli želi pogledati, kdo je kdaj odsoten in koliko dni dopusta
ima kdo še na voljo.

## Done for the person
Odsotnost je shranjena, delovni dnevi so prešteti pravilno (brez vikendov in
praznikov), mesečni pregled kaže, kdo je kdaj odsoten, stanje dni na osebo pa je
točno.

## Primary action
**Nova odsotnost** (bližnjica N): gumb na ploščici Domov in v ⌘K, odpre `/m/leave?nov=1`.
Dodatno dejanje v ⌘K: **Dodaj osebo** (`/m/leave?tab=ekipa&nov=1`).

## Tile line
„Danes odsotni: 2" ali „Danes so vsi na delu".

## Flow (fewest steps)
1. **Nova odsotnost** (N) odpre sheet:
   - **Oseba**: čipi za 5 nazadnje uporabljenih oseb + izbirnik za ostale.
   - **Od**: privzeto danes, ob vikendu ali prazniku naslednji delovni dan. **Do**: privzeto enako kot Od.
   - **Vrsta**: Dopust (privzeto) · Bolniška · Drugo.
   - **Opomba**: skrita pod „Dodaj opombo".
   - Število delovnih dni se kaže sproti („5 delovnih dni"), strežnik ga izračuna znova.
   - Enter shrani, toast „Odsotnost shranjena".
2. **Zavihek Odsotnosti** (privzeti): tekoči mesec, ‹ › za premik po mesecih. Vrstice
   so razvrščene po začetku: „Ana Novak · Dopust · 2.–6. nov. · 5 dni". V glavi:
   „8 odsotnosti · 23 delovnih dni". Uredi in Izbriši sta v meniju vrstice, brisanje
   ima „Razveljavi".
3. **Zavihek Ekipa** (`?tab=ekipa`): vrstica na osebo, npr. „Ana Novak · še 12 od 25 dni"
   (tekoče leto, šteje se samo Dopust). „+ Dodaj osebo" odpre sheet: ime in letni
   fond dni (privzeto zadnja vnesena vrednost, sicer 20). Fond se ureja v istem sheetu.

**Kliki za glavno delo:** ~5 na telefonu (N → čip osebe → Od → Do → Enter). Za
enodnevno današnjo odsotnost so 3 (N → čip → Enter).

## Štetje dni
- Delovni dnevi = pon–pet brez slovenskih dela prostih praznikov: 1. in 2. 1., 8. 2.,
  velikonočni ponedeljek (izračunan), 27. 4., 1. in 2. 5., 25. 6., 15. 8., 31. 10.,
  1. 11., 25. in 26. 12. Seznam se ob `/build` še enkrat preveri.
- Ena funkcija (`modules/leave/lib/workdays.ts`), ki jo uporabljata sheet (prikaz v
  živo) in strežniško dejanje (shranjena vrednost).
- Stanje dni za leto L = fond − delovni dnevi dopusta, ki padejo v leto L. Odsotnost
  čez novo leto se pravilno razdeli med obe leti.

## Data stored
- `leave_people`: `id`, `user_id` (kdo je dodal), `full_name`, `annual_days` (int),
  `created_at`.
- `leave_absences`: `id`, `user_id` (kdo je vnesel), `person_id` → `leave_people`
  (on delete restrict), `kind` (`dopust` | `bolniska` | `drugo`), `start_date`,
  `end_date` (check `end_date >= start_date`), `work_days` (izračuna strežnik),
  `note`, `created_at`, `updated_at`.
- **RLS (deljeni podatki):** vsak, ki ima dodeljen modul `leave`, ali lastnik, lahko
  bere in piše vse vrstice obeh tabel. Pravilo izhaja iz dodelitve, ne iz seznama imen:
  ```sql
  using (public.is_owner() or exists (
    select 1 from public.core_user_modules g
    where g.user_id = auth.uid() and g.module_id = 'leave'))
  ```
  Isti predikat velja za `with check`. Tabele in politike so v isti migraciji
  (`modules/leave/db/0001_leave.sql`).

## Access
Modul `leave` dodeli lastnik v Adminu vodji in kadrovnici. Oba vidita in urejata isto
ekipo in iste odsotnosti. Zaposleni se ne prijavljajo. Član vidi samo dodeljene module.

## First slice (ena seja)
Vse tri stvari skupaj, ker je vsaka majhna in brez ostalih nima smisla: ekipa s fondom,
vnos odsotnosti, mesečni pregled in stanje dni.

## Steps
1. `/scaffold-module` → `leave`, ime „Dopusti", ikona `tree-palm`, kartica obstaja
   (posodobi, ne podvajaj).
2. `modules/leave/db/0001_leave.sql`: registracija modula, dodelitev lastnikom, obe
   tabeli in deljene RLS politike.
3. `modules/leave/lib/workdays.ts`: prazniki, velikonočni ponedeljek, `countWorkDays(od, do)`
   in razdelitev po letih.
4. `modules/leave/actions.ts`: `createPerson`, `updatePerson`, `createAbsence`,
   `updateAbsence`, `deleteAbsence` (+ obnovitev za Razveljavi). Vsako dejanje kliče
   `moduleContext("leave")` in validira z zod.
5. `pages.tsx` + `absence-sheet.tsx` + `person-sheet.tsx` + `strings.ts`: zavihka
   Odsotnosti in Ekipa, `FormSheet`, `DataList`, `EmptyState` (brez ekipe: „Najprej
   dodaj ekipo", brez odsotnosti v mesecu: „Nova odsotnost"). Datumi gredo skozi
   `lib/format.ts`.
6. Vnos v `_registry.ts` (`primaryAction`, `actions`, `keywords`: dopust, bolniška,
   odsotnost) in `summary.ts` (en poizvedba: današnje odsotnosti).

## Done when
1. Vodja doda osebo „Ana Novak" s fondom 25, vnese dopust 2.–6. 11. 2026 in vidi
   „5 delovnih dni" že v sheetu. Po shranitvi je odsotnost v novembru, Ekipa pa kaže
   „še 20 od 25 dni".
2. Dopust čez praznike 21.–31. 12. 2026 prešteje 8 dni (vikenda odpadeta, 25. 12. je
   praznik v petek, 26. 12. je sobota). Bolniška ne zmanjša fonda.
3. Druga oseba z dodeljenim modulom vidi iste podatke. Uporabnik brez dodelitve modula
   ne vidi in ga strežnik zavrne.
4. Brisanje odsotnosti se da razveljaviti. Ploščica Domov kaže današnje odsotne.
5. Glavno delo traja ≤ 5 klikov na telefonu. Prazna stanja, svetla in temna tema,
   slovenska besedila, brez surovih datumov.

## Rez 2: prazniki, dnevi podjetja, koledar

**Job:** vodja na enem zaslonu vidi, kdo manjka hkrati, in odsotnost popravi z enim potegom
namesto z odpiranjem obrazca. Prazniki in dela prosti dnevi podjetja so vidni in se ne štejejo
v dopust.

**Tok:**
1. **Zavihek Koledar** (`?tab=koledar&mesec=`): vrstice so osebe, stolpci dnevi meseca, odsotnost
   je pas (dopust / bolniška / drugo v svoji barvi). Vikendi, prazniki in dnevi podjetja so
   zasenčeni, ime praznika se pokaže ob prehodu z miško. Danes je poudarjen.
2. **Vlečenje (računalnik):** pas povlečeš na druge dneve (dolžina ostane), za rob ga podaljšaš
   ali skrajšaš. Delovni dnevi se izračunajo znova, toast z „Razveljavi". Spust na dneve brez
   delovnih dni vrne napako in pas se vrne. Tipkovnica: ←/→ premakne za dan, Shift+←/→
   spremeni konec, Enter odpre urejanje.
3. **Telefon:** koledar drsi vodoravno, dotik pasu odpre urejanje.
4. **Klik na prazno celico** odpre „Nova odsotnost" z izbrano osebo in datumom (2 klika + Enter).
5. **Zavihek Prazniki** (`?tab=prazniki&leto=`): državni prazniki leta (samo za branje) in dnevi
   podjetja. „Dodaj dela prost dan" (N): ime, od, do. Brisanje z „Razveljavi".

**Podatki:** `leave_company_days` (`name`, `start_date`, `end_date`, `user_id`), RLS kot ostali
tabeli modula (`leave_can_access()`). Ob dodajanju ali brisanju dneva podjetja strežnik znova
izračuna `work_days` odsotnostim, ki se z obdobjem prekrivajo.

**Done when:**
1. Dan podjetja 28.–30. 12. 2026 zmanjša dopust 21.–31. 12. z 8 na 5 dni, Ekipa se posodobi.
2. Koledar pokaže praznike (npr. 31. 10. dan reformacije) zasenčene in poimenovane.
3. Vlečenje pasu za 2 dni premakne datume in znova prešteje dni; „Razveljavi" ga vrne;
   raztezanje roba spremeni konec; spust na sam vikend se zavrne.
4. Klik na prazno celico odpre predizpolnjen sheet; na telefonu dotik pasu odpre urejanje.
5. Član brez dodelitve ne vidi dni podjetja in jih ne more vnesti.

## Out of scope
- Poldnevni dopust in ure.
- Samodejni prenos neporabljenih dni iz lanskega leta (vodja ga za zdaj prišteje k fondu).
- Prijava zaposlenih, prošnje in odobritve.
- Opozorila na prekrivanje odsotnosti, izvoz.
- Vlečenje odsotnosti na drugo osebo in vlečenje na telefonu.
- Arhiviranje oseb (oseba z odsotnostmi se ne da izbrisati).
