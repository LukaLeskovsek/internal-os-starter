// Every word the invoice_ocr module shows a person. Copy changes happen here, not in
// the components. Plural forms follow Slovenian (1 račun, 2 računa, 3 računi, 5 računov).
import { count } from "@/lib/format";

export type InvoiceStatus = "pending" | "approved" | "rejected";

export const t = {
  title: "Računi",
  description: "Naloži račune, preveri, kar je prebral AI, in jih potrdi ali zavrni.",

  status: {
    pending: "Za pregled",
    approved: "Potrjen",
    rejected: "Zavrnjen",
  } satisfies Record<InvoiceStatus, string>,

  tabs: {
    queue: "Za pregled",
    done: "Obdelano",
  },

  upload: {
    button: "Naloži račune",
    dropTitle: "Povleci račune sem ali klikni in izberi",
    dropHint: "PNG, JPG ali PDF, do 8 MB. Lahko jih izbereš več naenkrat.",
    overlay: "Spusti račune kjerkoli",
    overlayHint: "Prebral jih bom in dodal v vrsto za pregled.",
    reading: "Berem…",
    tooBig: "Datoteka je prevelika (največ 8 MB).",
    wrongType: "Dovoljeni so PNG, JPG ali PDF.",
    noFile: "Najprej izberi datoteko računa.",
    storeFailed: "Datoteke ni bilo mogoče shraniti. Poskusi znova.",
    saveFailed: "Računa ni bilo mogoče shraniti. Poskusi znova.",
    /** "3 računi prebrani" */
    doneMany: (n: number) =>
      count(n, { one: "račun prebran", two: "računa prebrana", few: "računi prebrani", other: "računov prebranih" }),
    fileError: (name: string, error: string) => `${name}: ${error}`,
    /** Shown once when the daily AI limit stops the rest of a batch. */
    skipped: (n: number) =>
      `${count(n, { one: "datoteka ni bila prebrana", two: "datoteki nista bili prebrani", few: "datoteke niso bile prebrane", other: "datotek ni bilo prebranih" })}.`,
  },

  queue: {
    startReview: "Začni pregled",
    emptyTitle: "Vse pregledano",
    emptyText: "Ni računov, ki bi čakali nate. Nove naloži zgoraj ali jih povleci na stran.",
    firstTitle: "Še ni računov",
    firstText: "Povleci prvi račun na stran. AI ga prebere, ti samo preveriš in potrdiš.",
    unknownVendor: "Neznan dobavitelj",
    number: (n: string) => `št. ${n}`,
    issued: (d: string) => `izdan ${d}`,
    due: (d: string) => `zapade ${d}`,
    dueToday: "zapade danes",
    overdue: (rel: string) => `zapadlo ${rel}`,
    missing: "Manjkajo podatki",
  },

  done: {
    searchPlaceholder: "Išči po dobavitelju…",
    search: "Išči",
    clear: "Počisti",
    export: "Izvozi CSV",
    emptyTitle: "Še nič obdelanega",
    emptyText: "Ko potrdiš ali zavrneš račun, se pojavi tukaj.",
    noMatchTitle: "Ni zadetkov",
    noMatchText: (q: string) => `Noben obdelan račun ni od dobavitelja »${q}«.`,
    reviewed: (rel: string) => `pregledano ${rel}`,
    reopen: "Vrni v pregled",
    reopened: "Račun je spet v vrsti za pregled.",
    limited: (n: number) => `Prikazanih je zadnjih ${n}. Za starejše uporabi iskanje ali izvoz.`,
  },

  review: {
    back: "Nazaj na seznam",
    position: (i: number, n: number) => `${i} / ${n}`,
    prev: "Prejšnji",
    next: "Naslednji",
    unsaved: "Popravkov še nisi shranil",
    unsavedText: "Če greš na drug račun, se izgubijo.",
    discard: "Zavrzi in pojdi",
    notFound: "Tega računa ni",
    notFoundText: "Morda je bil izbrisan ali pa ni tvoj.",
    original: "Original",
    openOriginal: "Odpri v novem zavihku",
    noPreview: "Predogleda ni mogoče prikazati.",
    pdfTitle: "Račun v PDF",
    imageAlt: "Slika računa",
    demo: "Demo branje",
    demoHint: "Brez povezave z AI je prikazan primer računa, da lahko preizkusiš potek.",
    duplicate: "Možen dvojnik",
    duplicateHint: "Imaš še en račun istega dobavitelja z isto številko.",
    emptyHint: "AI tega ni prebral. Dopolni s pogledom na original.",
    statusNote: (label: string, rel: string) => `${label} ${rel}. Odločitev lahko spremeniš.`,
    fields: {
      vendor: "Dobavitelj",
      number: "Številka računa",
      currency: "Valuta",
      issueDate: "Datum izdaje",
      dueDate: "Rok plačila",
      net: "Neto",
      tax: "DDV",
      total: "Skupaj",
      comment: "Komentar",
    },
    commentPlaceholder: "npr. ujema se z naročilnico 123",
    sumOk: "Neto + DDV se ujema s skupnim zneskom.",
    sumOff: (expected: string) => `Neto + DDV je ${expected}, kar se ne ujema s skupnim zneskom.`,
    sumFix: "Popravi skupaj",
    lines: (n: number) => `Postavke (${n})`,
    noLines: "AI ni zaznal postavk.",
    reject: "Zavrni",
    rejectConfirm: "Zavrni račun",
    rejectCancel: "Prekliči",
    rejectTitle: "Zakaj ga zavračaš?",
    /** Chips that fill the comment in one click. */
    reasons: ["Napačen znesek", "Ni naročilnice", "Dvojnik"],
    /** The last chip: focuses the comment so the person writes their own reason. */
    otherReason: "Drugo",
    approveNext: "Potrdi in naprej",
    approve: "Potrdi",
    approved: (vendor: string) => `Potrjeno: ${vendor}`,
    rejected: (vendor: string) => `Zavrnjeno: ${vendor}`,
  },

  errors: {
    badId: "Neveljaven račun.",
    notFound: "Računa ni bilo mogoče najti.",
    needVendor: "Vpiši dobavitelja.",
    needTotal: "Vpiši skupni znesek.",
    needReason: "Napiši, zakaj račun zavračaš.",
    badAmount: "Vpiši znesek, npr. 1250,00.",
    badDate: "Izberi datum.",
    badCurrency: "Valuta je trimestna oznaka, npr. EUR.",
    tooLong: "Besedilo je predolgo.",
  },

  csv: {
    header: [
      "Dobavitelj",
      "Št. računa",
      "Izdan",
      "Zapadlost",
      "Valuta",
      "Neto",
      "DDV",
      "Skupaj",
      "Status",
      "Komentar",
      "Naloženo",
    ],
    filename: (date: string) => `racuni-${date}.csv`,
    unsupported: (f: string) => `Nepodprt format: ${f}`,
  },
} as const;
