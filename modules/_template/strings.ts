// Every word the person reads in this module, in Slovenian. Shared words
// (Shrani, Prekliči, Razveljavi…) come from lib/i18n/sl.ts.
import type { PluralForms } from "@/lib/format";

export const t = {
  title: "Zapiski",
  description: "Hitro zapiši, kar se je zgodilo. Ponovi s klikom.",
  newItem: "Nov zapis",
  sheetNew: "Nov zapis",
  sheetEdit: "Uredi zapis",
  sheetDescription: "Vpiši le, kar je novo. Ostalo smo izpolnili namesto tebe.",
  recent: "Nedavno",
  fieldTitle: "Kaj",
  fieldTitlePlaceholder: "npr. Sestanek s stranko",
  fieldDate: "Datum",
  fieldNote: "Opomba",
  addNote: "Dodaj opombo",
  save: "Shrani zapis",
  repeat: "Ponovi",
  repeatHint: "Ponovi ta zapis z današnjim datumom",
  moreActions: "Več dejanj",
  empty: "Še ni zapisov",
  emptyText: "Prvi zapis vzame nekaj sekund. Naslednje ponoviš z enim klikom.",
  created: "Zapis shranjen.",
  updated: "Zapis posodobljen.",
  repeated: "Zapis ponovljen za danes.",
  deleted: "Zapis izbrisan.",
  restored: "Zapis vrnjen.",
  notFound: "Tega zapisa ni več.",
  saveFailed: "Zapisa ni bilo mogoče shraniti. Poskusi znova.",
  errTitle: "Napiši, kaj se je zgodilo.",
  errDate: "Izberi datum.",
  errTooLong: "Besedilo je predolgo.",
} as const;

export const itemsWord: PluralForms = { one: "zapis", two: "zapisa", few: "zapisi", other: "zapisov" };
