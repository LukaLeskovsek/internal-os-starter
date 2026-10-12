# Priprava za delavnico Tovarne podjemov

S Claudom pripravi svojo aplikacijo v ločeni mapi. Ne potrebuješ predhodnega »Day 2« ali drugega starterja. Začni z eno uporabno funkcijo iz svoje naloge.

**Najhitreje:** v mapi aplikacije v Claude Code napiši »Nastavi mi internal-os«. Skill `/nastavitev` te vodi skozi vse spodaj (račune, ključe, bazo, lastnika, objavo), ključe pa prilepiš sam neposredno v `.env.local`. Navodila za ljudi so v [nastavitev.md](nastavitev.md); ta stran je kontrolni seznam za Clauda.

## Pripravi svojo kopijo

Uporabi svoj zasebni GitHub repozitorij. Mapa aplikacije naj bo ob mapi delavnice, ne znotraj javnih učnih gradiv ali njihovega moje-delo/. Pred uporabo preveri dejanski račun, vidnost repozitorija in origin. Javnega starterja ne uporabljaj kot cilj za svoje spremembe. GitHubova predloga je tu možnost za novo aplikacijo; gradiva delavnice še naprej posodabljaš z običajnim pullom v njihovi mapi.

Claude naj preveri Node iz .nvmrc in obstoječe namestitve. Uporabi npm ci za odvisnosti iz zaklenjenega seznama, nato npm run lint in npm run build. npm run audit:security je informativen: trenutno javlja znane opozorila odvisnosti (glej docs/security.md) in ni pogoj za začetek. Uspešna sestava še ne potrjuje prijave ali dostopa do podatkov.

## Računi in podatki

Za lokalni zagon potrebuješ svoj Supabase projekt, povezan s Claudom prek Supabase MCP (omejeno na ta projekt). Claude naj preveri ciljni projekt, nato z npm run db:list in preverbo tabel uporabi samo manjkajoče migracije (jedro in vsi moduli); ne zaganjaj vseh ponovno na slepo. Nato z npm run seed:admin ustvari začetnega lastnika. Ključe vneseš v .env.local, brez kopiranja v pogovor; npm run env:check pokaže, kaj je izpolnjeno. Potrditev elektronskega naslova ostane vklopljena; sodelavce dodaja lastnik v Administraciji.

Vercel pripravi ob objavi. Resend, Sentry in Intrix so dodatki glede na nalogo. Za prikaz ne uporabljamo skupnih ključev izvajalca. Za AI v aplikaciji uporabi svoj OpenRouter API ključ in preverjen model ter omeji porabo; naročnina na Claude Desktop tega dostopa ne nadomesti. Za prvi modul lahko uporabiš shranjene predloge brez klica modela.

AI_BACKEND=openrouter je osnovna pot za aplikacijo. local-claude ni del delavniške priprave večuporabniške ali gostovane aplikacije. Mock izhod vedno označi; ne šteje kot delujoč model.

## Poveži obstoječi profil

Claudu pokaži potrjeno lokacijo profila iz delavnice. Naj jo z izbranim podjetjem zapiše v .claude/profile-location.local.md, ki ga Git ignorira. Obstoječih profilov in globalnih navodil ne prepisuje. V novem pogovoru naj prebere PERSON.md, INDEX.md ter ustrezne COMPANY.md, BRAND.md in PRIMERI.md. Če profil na novi napravi manjka, naj to pove in ponovno preveri lokacijo.

Ta profil pomaga pri razvoju in pisanju. Model v aplikaciji prejme samo kontekst, ki ga aplikacija izrecno pripravi. Pred vključitvijo pravil preveri, ali jih sme videti izbrani uporabnik oziroma ponudnik modela.

## Prvi uporaben modul

Preberi predajo iz delavnice in uporabi projektne /plan, /build, /verify. Ne ponavljaj intervjuja, če so odgovori že zapisani. Preveri izvor uporabljene veščine, kadar obstaja več enako poimenovanih ukazov.

Za primer Moj pregled dela najprej uporabi dovoljen shranjen pregled, brez žive pošte: seznam, podrobnosti, popravek in shranjena odločitev. Vsak uporabnik vidi samo svoje zapise. Skupinsko predajo in n8n poveži šele po preverjanju dostopa in dogovoru, kje je glavno stanje.

Pri /verify preveri shranjevanje po osvežitvi, nepopoln zapis, uporabnika brez pravice do modula in neposreden dostop do tujega zapisa. Uporabi testne račune. Lokalni preizkus, živa povezava in spletna objava imajo ločene rezultate.

/ship uporabi, ko je objava izrecno dogovorjena. Pred pushom preveri, ali sproži samodejno objavo. V napredek delavnice shrani lokacijo aplikacije, preverjeno funkcijo, omejitve in naslednji korak; kodo shranjuj v svojem repozitoriju aplikacije.
