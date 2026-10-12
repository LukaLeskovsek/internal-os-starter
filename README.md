# Internal OS Starter

Notranji sistem tvojega podjetja: **ena aplikacija, ena prijava in več orodij (modulov)**, lastnik pa v administraciji določi, kdo vidi katero orodje.

Ni ti treba biti programer. Odpri Claude Code v mapi aplikacije in napiši **»Nastavi mi internal-os«**. Claude te vodi korak za korakom, navodila za ljudi pa so v [docs/nastavitev.md](docs/nastavitev.md). Ukazov, ki se začnejo s poševnico (`/nastavitev`, `/integrate-api` …), ti ni treba tipkati: Claude jih izbere sam, ko poveš, kaj želiš.

Če prihajaš z delavnice Tovarne podjemov, začni s [Pripravo za delavnico](docs/delavnica.md). Claude ti pomaga pripraviti tvojo zasebno aplikacijo in uporabi profil, ki ga že imaš z delavnice.

Uporabljaš svoje račune GitHub in Supabase. Gostovanje, e-pošto, spremljanje napak in AI dodaš, ko jih tvoje orodje potrebuje.

## Kaj dobiš

Predloga ima že narejena orodja. Preberi jih, da vidiš vzorce, nato zgradi svoja. Vsako ima svojo migracijo (datoteko, ki v bazi ustvari tabele orodja) v `modules/<id>/db/`, Claude pa jo požene med nastavitvijo. RLS v tabeli spodaj pomeni pravila v bazi, ki določajo, kdo vidi katero vrstico.

| Orodje | Kaj pokaže |
|---|---|
| **Administracija** (`admin`) | Upravljanje uporabnikov in orodij, samo za lastnike. |
| **CRM (demo)** (`crm_demo`) | Branje iz zunanjega API-ja, z demo podatki, ko ključa ni. Vzorec za `/integrate-api`. |
| **AI pomočnik** (`ai_assist`) | Klic jezikovnega modela na strežniku, odgovor shranjen v tabeli z RLS. Vzorec za `/integrate-ai`. |
| **Delovni nalogi** (`work_orders`) | Dodeljevanje: pisarna dodeli nalog, teren ga zaključi na telefonu. Vzorec za vrstice, ki si jih delita ustvarjalec in izvajalec. |
| **Potni nalogi** (`travel_orders`) | Hiter vnos z izračunanimi vrednostmi (km × postavka). Vzorec za najpogostejši način dela, hiter vnos. |
| **Dopusti** (`leave`) | Skupni podatki ekipe (RLS glede na dodeljeno orodje), štetje delovnih dni s slovenskimi prazniki in koledar ekipe z vlečenjem. |
| **Likvidacija računov** (`invoice_ocr`) | Branje računov z AI: naložiš fotografijo ali PDF, model za slike prebere glavo **in vsako postavko**, v tabeli za likvidacijo pa račun potrdiš ali zavrneš. Vsak račun ima **svoj zaslon za pregled** (prebrane vrednosti, tabela postavk, predogled PDF-ja ali slike in komentar), na koncu je **izvoz v CSV**. Doda zasebno shrambo Supabase **Storage**. Klient za branje je v modulu (`lib/ocr.ts`, z demo načinom kot `crm_demo`). Vmesnik je v slovenščini. Potrebuje model, ki bere slike, v `OPENROUTER_VISION_MODEL`. |

## Administracija (samo za lastnike)

Odpri **`/m/admin`** z računom lastnika. Tam:

- dodaš osebo (e-pošta in začasno geslo; aplikacija ne pošlje e-pošte, geslo ji posreduješ sam), ji spremeniš vlogo (član ali lastnik), jo onemogočiš ali izbrišeš. Onemogočena oseba nima dostopa do nobenega dela aplikacije;
- orodje vklopiš ali izklopiš (izklopljeno izgine z začetne strani in je zaprto tudi za tiste, ki jim je dodeljeno), ga preimenuješ ali premakneš;
- v mreži dostopov določiš, kdo vidi katero orodje.

Za to potrebuje aplikacija skrivni ključ Supabase, ki ga pripraviš med nastavitvijo.

---

## Podrobnosti za delo v terminalu

`/nastavitev` vse to naredi s teboj. Spodaj so isti koraki za tiste, ki raje delajo v terminalu.

Aplikacija teče na Next.js 15, Supabase (prijava in baza z RLS), Resend, Sentry in Vercel. Začneš lahko tukaj, brez drugega tečaja ali repozitorija.

Dodajanje, vloge, onemogočanje in brisanje uporabnikov v Administraciji tečejo na strežniku s **skrivnim ključem** Supabase (strežniški klient, za preverbo lastnika), zato mora biti `SUPABASE_SERVICE_ROLE_KEY` v `.env.local` (Supabase → Settings → API Keys → ključ `sb_secret_…`). Ključ obide RLS in ga aplikacija uporablja samo za preverbo lastnika. Nikoli ga ne pokaži in mu ne dodaj predpone `NEXT_PUBLIC_`.

### 1. Koda v tvojem repozitoriju

Na GitHubu klikni **»Use this template« → Create a new repository** in ga nastavi kot **Private**. To je tvoja kopija, kamor pošiljaš spremembe, in hrani tvojo aplikacijo *ter njeno zgodovino*. Nato:

```bash
git clone https://github.com/<your-username>/internal-os-starter.git
cd internal-os-starter
npm ci
```

Ali z enim ukazom: `gh repo create <name> --template LukaLeskovsek/internal-os-starter --private --clone`.
Izvor predloge: https://github.com/LukaLeskovsek/internal-os-starter
Git ti je nov? Trije varni ukazi in eno pravilo: [docs/git-basics.md](docs/git-basics.md).

### 2. Projekt Supabase

- Na supabase.com izberi **New project** (regija v EU).
- **Confirm email** pusti vklopljen. Sodelavci pridejo prek Administracije (ustvarjeni so že potrjeni), javne registracije postanejo **člani brez dodeljenih orodij**, lastnika pa ustvari skripta `seed:admin`.
- V **Authentication → URL Configuration** nastavi Site URL `http://localhost:3000` in Redirect URLs `http://localhost:3000/**`. Živi naslov dodaš kasneje.
- S tem projektom poveži **Supabase MCP**, da Claude prebere naslov in javni ključ ter požene migracije (prijava OAuth, brez dostopnega žetona):
  `claude mcp add --transport http --scope local supabase "https://mcp.supabase.com/mcp?project_ref=<ref>&features=database,development,docs,debugging"`,
  nato `/mcp` → supabase → Authenticate.

### 3. Ključi in baza

```bash
cp .env.example .env.local
```

Izpolni Supabase URL in javni (anon) ključ, `SUPABASE_SERVICE_ROLE_KEY` (Settings → API Keys → ključ `sb_secret_…`) in `ADMIN_EMAIL`. `npm run env:check` pokaže, kateri ključi so izpolnjeni in pravilne oblike, ne da bi jih izpisal. `INTRIX_API_KEY` in `OPENROUTER_API_KEY` pusti prazna za **demo način**.

Nato Claudu reci **»pripravi bazo«**. Celoten seznam po vrsti dobiš z ukazom:

```bash
npm run db:list          # jedro 0001–0006, nato datoteke db/ vseh modulov
```

Claude prek Supabase MCP (`apply_migration`) požene vsako datoteko, ki še ni bila pognana, pred tem pa za vsako preveri njeno kontrolno tabelo. `0001_core` in `ai_assist/0001` se ne smeta pognati dvakrat. Brez MCP isto naredi `npm run db:run -- <file>` z `SUPABASE_ACCESS_TOKEN` (supabase.com → Account → Access Tokens).

Nato postani lastnik:

```bash
npm run dev              # povezava spodaj kaže na zagnano aplikacijo
npm run seed:admin       # v brskalniku odpre enkratno povezavo za geslo
```

Klikni **Nadaljuj**, nastavi geslo in ta račun uporabljaj za Administracijo. Ukaz `npm run seed:admin -- --print` povezavo izpiše, na primer da jo pošlješ komu drugemu.

### 4. Zagon

Odpri http://localhost:3000 (`npm run dev` mora teči) in se prijavi kot lastnik. Sodelavce dodaš v **Administracija → Uporabniki**, orodja jim dodeliš v **Dostopi**.

### 5. Novo orodje

Claudu reci:
> "/scaffold-module leads \"Leads\""

Claude ustvari `modules/leads/`, orodje registrira, napiše migracijo s predpono in RLS ter ga poveže v usmerjevalnik. Nato **požene njegovo migracijo** (Supabase MCP ali `npm run db:run`). Lastniki novo orodje dobijo samodejno, sodelavcem ga dodeliš v **Administraciji**.

### 6. Zunanji API (neobvezno)

> "/integrate-api for the leads module"

Vzorec je modul `crm_demo`, ki bere kontakte iz **Intrixa** (samo branje, z demo podatki, ko ključa ni).

### 7. Objava na Vercelu

Uvozi repozitorij na vercel.com/new, nato:

```bash
npx vercel login && npx vercel link
npm run vercel:env -- --site-url https://<project>.vercel.app   # --dry-run najprej izpiše seznam ključev
```

Ponovno objavi (Redeploy), živi naslov dodaj v Supabase **URL Configuration** in izklopi **Vercel Authentication** (Settings → Deployment Protection), če živa stran zahteva prijavo v Vercel. Od takrat vsak push na `main` objavi novo različico.

## Pravila in kako se preverjajo

- Orodje je mapa, vnos v registru in vrstica v `core_modules`.
- Dostop do orodja je **podatek** (`core_user_modules`), strežnik pa ga preveri v `app/m/[module]/page.tsx`.
- Vsaka tabela orodja ima **predpono** (`leads_*`) in svoj **RLS** v lastni migraciji.
- `/check-architecture` preveri vse našteto. Glej `CLAUDE.md` in `docs/architecture.md`.

## Skripte

- `npm run dev` · `npm run build` · `npm run lint` · `npm start`
- `npm run seed:admin` ustvari ali posodobi prvega lastnika in odpre enkratno povezavo za geslo (`-- --print` jo izpiše).
- `npm run env:check` pokaže, kateri ključi v `.env.local` so izpolnjeni in pravilne oblike (vrednosti nikoli ne izpiše).
- `npm run db:list` izpiše vse migracije po vrsti in kako preveriš, ali je bila posamezna pognana (`-- --json` za Clauda).
- `npm run db:run -- <file>` požene eno migracijo z `SUPABASE_ACCESS_TOKEN` (če ne uporabljaš Supabase MCP).
- `npm run vercel:env -- --site-url <url>` kopira potrebne ključe na Vercel, ne da bi jih izpisal.
- `npm run audit:security` javi napako ob visokih ali kritičnih opozorilih npm.

## Opombe

- Opozorilo Supabase »Edge Runtime / `process.version`« pri gradnji je pričakovano in neškodljivo.
- Skrivnosti so v `.env.local` in na Vercelu, nikoli v kodi ali v klepetu.
- Varnost: `docs/security.md`.
- Povezava z aplikacijo z 2. dne: `docs/relationship-to-saas-starter.md`.

### AI: lokalna priprava in objava

Lokalno je privzeta pot preverjeni naročniški račun Claude (`AI_BACKEND=local-claude`). Preverjanje okolja potrdi način prijave; vsak AI-klic ga preveri ponovno. Lokalna napaka ne sproži API-ja ali navideznega rezultata. Prijava v Console sama po sebi ni naročnina.

Na Vercelu je lokalni Claude zavrnjen. Aplikacija lahko deluje brez AI; za uporabo modela prek OpenRouterja posebej pripravi ključ z omejitvijo porabe, model in dnevni limit klicev. Omejitve naročnine in morebitne dodatne dobropise preveri pri ponudniku. [Priprava](docs/nastavitev.md) · [Meje preverjanja in varnost](docs/security.md).
