# Nastavitev internal-os, korak za korakom

Ta navodila so za ljudi, ki niso programerji. Večino dela opravi Claude. Ti ustvariš račune,
potrdiš prijave in prilepiš nekaj ključev. Vse skupaj traja okoli 45 minut, objava na internetu pa
še 15.

## Kako začneš

1. Odpri **Claude Code** v mapi, kamor želiš aplikacijo (na primer `Dokumenti/internal-os`).
2. Če aplikacije še nimaš, napiši:
   > Ustvari mi zasebno kopijo predloge LukaLeskovsek/internal-os-starter in jo odpri.
3. Ko si v mapi aplikacije, napiši:
   > Nastavi mi internal-os.

Claude najprej preveri, kaj je že narejeno, in začne pri prvem koraku, ki manjka. Če prekineš, se
kasneje vrneš z »nadaljuj nastavitev«.

## Kaj potrebuješ

| Kaj | Zakaj | Cena |
|---|---|---|
| Računalnik z macOS ali Windows | tu teče aplikacija med razvojem | – |
| Claude Code (naročnina Claude) | gradi in nastavlja aplikacijo | tvoja naročnina |
| Račun **GitHub** | tvoja zasebna kopija kode | brezplačno |
| Račun **Supabase** | baza in prijava uporabnikov | brezplačni paket zadošča |
| Račun **OpenRouter** (neobvezno) | umetna inteligenca v aplikaciji | po porabi, z omejitvijo |
| Račun **Vercel** (neobvezno) | aplikacija na internetu, za sodelavce | brezplačni paket zadošča |
| Upravljalnik gesel (npr. 1Password, Bitwarden ali tisti v brskalniku) | tja shraniš geslo baze | – |

## Zlato pravilo za ključe

Ključ je kot geslo. **Nikoli ga ne prilepi v klepet s Claudom.** Claude ti odpre pravo stran in
datoteko `.env.local` v urejevalniku. Ti ključ kopiraš s strani in ga prilepiš v datoteko, shraniš
in zapreš. Claude nato preveri samo, ali je ključ na pravem mestu (z ukazom `npm run env:check`),
vrednosti pa nikoli ne vidi.

Če ključ po pomoti prilepiš v klepet, ga v nadzorni plošči ponudnika zamenjaj z novim.

## Koraki

Pri vsakem koraku piše, kaj naredi Claude in kaj ti.

### 1. Orodja na računalniku
- **Claude** preveri, ali imaš Node 22, git in GitHub CLI. Česar ni, ti odpre stran za prenos.
- **Ti** namestiš, kar manjka, in se prijaviš v GitHub. Claude ti pove, kaj napisati
  (`! gh auth login --web`), prijavo pa potrdiš v brskalniku.

### 2. Tvoja zasebna kopija na GitHubu
- **Claude** ustvari zasebni repozitorij iz predloge in ga poveže s tvojo mapo.
- **Ti** izbereš ime.

### 3. Supabase: projekt in povezava s Claudom
- **Ti** v brskalniku ustvariš projekt:
  - ime izbereš sam;
  - regija: **Central EU (Frankfurt)**;
  - geslo baze shraniš v upravljalnik gesel, ne pošlješ ga Claudu.
- **Claude** poveže Supabase s seboj, vendar samo za ta en projekt.
- **Ti** zapreš in znova odpreš Claude Code, napišeš `/mcp`, izbereš **supabase → Authenticate** in
  potrdiš v brskalniku. Nato napišeš »nadaljuj nastavitev«.

### 4. Ključi v `.env.local`
- **Claude** sam vpiše javne podatke (naslov projekta, javni ključ, tvoje ime in e-pošto).
- **Ti** prilepiš en skrivni ključ. Claude odpre stran **API Keys** in datoteko. Pri **Secret keys**
  kopiraš ključ, ki se začne s `sb_secret_`, in ga prilepiš takoj za `SUPABASE_SERVICE_ROLE_KEY=`.
  Shraniš (⌘S oziroma Ctrl+S) in zapreš.
- **Claude** preveri, da je vse na mestu.

### 5. Nastavitve prijave
- **Claude** odpre stran **URL Configuration** v Supabase.
- **Ti** vpišeš **Site URL** `http://localhost:3000` in pri **Redirect URLs** dodaš
  `http://localhost:3000/**`. »Confirm email« pustiš vklopljen.

### 6. Baza
- **Claude** pripravi vse tabele in orodja. Najprej preveri, kaj je že narejeno, in nič ne ponovi
  dvakrat.

### 7. Zagon na tvojem računalniku
- **Claude** zažene aplikacijo na `http://localhost:3000`.

### 8. Ti postaneš lastnik
- **Claude** te nastavi kot lastnika in ti v brskalniku odpre enkratno povezavo.
- **Ti** klikneš **Nadaljuj** in si nastaviš geslo. Na začetni strani vidiš vsa orodja.

### 9. Umetna inteligenca (neobvezno)
Pri lokalnem razvoju je privzeta tvoja naročnina Claude. Claude preveri prijavo,
namestitev in klic brez osebnih orodij. Če AI ne potrebuješ, lahko nadaljuješ z
ostalimi funkcijami aplikacije.

Za AI v objavljeni aplikaciji posebej pripravi OpenRouter. Ključ vneseš neposredno
v `.env.local`, določiš omejitev porabe in izklopiš samodejno polnjenje. Claude
preveri model in dnevni limit klicev. Lokalna napaka te izbire ne opravi namesto tebe.

### 10. Na internet, za sodelavce (neobvezno)
- **Ti** se z GitHubom prijaviš v Vercel in uvoziš svoj repozitorij. Potem napišeš
  `! npx vercel login`.
- **Claude** poveže mapo s projektom in prenese ključe na Vercel, ne da bi jih pokazal.
- **Ti** klikneš **Redeploy**. V Supabase (stran iz 5. koraka) zamenjaš **Site URL** z živim
  naslovom in dodaš živi naslov med **Redirect URLs**. Če živa stran zahteva prijavo v Vercel,
  izklopiš **Vercel Authentication** (Claude ti odpre stran).
- Prijaviš se z istim geslom kot doma, saj si aplikaciji delita isto bazo.

### 11. Tvoj profil (neobvezno)
- Če imaš mapo s profilom (PERSON.md, COMPANY.md, BRAND.md …), Claude zapiše, kje je. Odslej
  gradi v tvojem jeziku in slogu.

## Ko je vse nastavljeno

- **Sodelavce dodaš** v **Administraciji** (ime, e-pošta, začetno geslo) in jim tam odpreš orodja,
  ki jih potrebujejo. Javna registracija ni potrebna.
- **Novo orodje:** povej Claudu, kaj potrebuješ, na primer »rad bi orodje za dopuste«. Claude
  najprej naredi kratek plan, nato ga zgradi, preveri in objavi.

## Ko se zatakne

| Kaj vidiš | Kaj narediš |
|---|---|
| Orodja ali ploščice ni na začetni strani | Reci »nadaljuj nastavitev«. Claude preveri bazo in dostope. |
| »Povezava ni veljavna« pri nastavljanju gesla | Reci »pošlji mi novo povezavo za lastnika«. Povezava velja samo enkrat. |
| AI vrača »Demo odgovor« | API ni povezan; vzorčni odgovor ni pravi rezultat. Reci »preveri nastavitev AI«. |
| Živa stran zahteva prijavo v Vercel | Izklopi Vercel Authentication (10. korak). |
| Po prijavi na živi strani te vrže nazaj na prijavo | Živi naslov manjka med Redirect URLs v Supabase (10. korak). |
| Karkoli drugega | Opiši, kaj si naredil in kaj vidiš. Claude to razišče korak za korakom. |

Za tehnične podrobnosti glej `README.md`, `docs/architecture.md` in `docs/security.md`.

## AI pri lokalnem razvoju in pri objavi

Pri lokalni pripravi nastavimo `AI_BACKEND=local-claude`. Claude preveri svojo namestitev in naročniško prijavo; `npm run env:check` pokaže le stanje, nikoli ključev. Pred prvim rezultatom preveri tudi omejitve paketa in morebitne dodatno plačljive dobropise na svojem računu. Če prijava ni prava ali klic ne uspe, se AI ustavi. Ne uporabi plačljivega API-ja ali vzorčnega odgovora.

Aplikacija je lahko lokalna, Supabase pa že v oblaku. `localhost:3000` je naslov aplikacije na tvojem računalniku; ne zagotavlja lokalne hrambe podatkov.

Na Vercelu lokalne naročnine ne uporabljamo. Aplikacija lahko deluje brez AI. Ko AI potrebuje ekipa, posebej nastavi `AI_BACKEND=openrouter`, svoj ključ z omejitvijo porabe, brez samodejnega polnjenja, ter preverjeni model. Dnevni limit klicev v aplikaciji in denarni limit ključa sta dve različni omejitvi. Napake proračuna ne ponavljamo samodejno.
