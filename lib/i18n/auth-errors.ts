// Supabase auth errors arrive in English (via ?error=). Translate at display
// time; the auth actions themselves stay untouched.
const MAP: [RegExp, string][] = [
  [/invalid login credentials/i, "Napačen e-poštni naslov ali geslo."],
  [/user already registered/i, "Ta e-poštni naslov je že registriran. Prijavi se."],
  [/password should be at least|at least 8 characters/i, "Geslo mora imeti vsaj 8 znakov."],
  [/passwords do not match/i, "Gesli se ne ujemata."],
  [/email not confirmed/i, "E-poštni naslov še ni potrjen."],
  [/rate limit|too many/i, "Preveč poskusov. Počakaj minuto in poskusi znova."],
  [/disabled/i, "Tvoj račun je onemogočen. Obrni se na lastnika."],
  [/invalid.*email|unable to validate email/i, "Vpiši veljaven e-poštni naslov."],
  [/same password|different from the old/i, "Novo geslo mora biti drugačno od starega."],
  [/expired|invalid.*(link|token)|otp/i, "Povezava je potekla ali ni veljavna. Zahtevaj novo."],
  [/^request$/i, "Zahteve ni bilo mogoče poslati. Preveri naslov in poskusi znova."],
];

export function authErrorSl(message: string | undefined | null): string | null {
  if (!message) return null;
  for (const [re, sl] of MAP) if (re.test(message)) return sl;
  return "Prijava ni uspela. Poskusi znova.";
}
