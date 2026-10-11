// Every word the travel_orders module shows. Shared words (Shrani, Razveljavi…)
// come from sl.common in lib/i18n/sl.ts.
import type { PluralForms } from "@/lib/format";

export const trips: PluralForms = { one: "pot", two: "poti", few: "poti", other: "poti" };

export const t = {
  title: "Potni nalogi",
  newTrip: "Nova pot",
  monthNav: "Izbira meseca",
  thisMonth: "Ta mesec",
  monthEmpty: "Ta mesec še ni poti",
  otherMonthEmpty: "V tem mesecu ni poti",
  emptyText: "Vpiši službeno pot in kilometrino izračunamo sami.",

  // The sheet
  sheetNew: "Nova pot",
  sheetEdit: "Uredi pot",
  sheetDescription: "Kilometrino izračunamo sami.",
  recentRoutes: "Nedavne poti",
  from: "Od",
  to: "Do",
  fromPlaceholder: "npr. Ljubljana",
  toPlaceholder: "npr. Maribor",
  km: "Kilometri",
  kmHintOneWay: "Ena smer",
  kmPlaceholder: "npr. 128",
  roundTrip: "Povratna pot",
  roundTripHint: "Kilometre podvojimo.",
  date: "Datum",
  customer: "Stranka",
  customerPlaceholder: "npr. Acme d.o.o.",
  addTime: "Dodaj čas",
  departed: "Odhod",
  arrived: "Prihod",
  reimbursement: "Povračilo",
  saveTrip: "Shrani pot",

  // Row actions
  repeat: "Ponovi",
  repeatHint: "Ponovi to pot z današnjim datumom",
  moreActions: "Več dejanj",

  // Results
  created: "Pot shranjena.",
  updated: "Pot posodobljena.",
  repeated: "Pot dodana za danes.",
  deleted: "Pot izbrisana.",
  restored: "Pot vrnjena.",
  notFound: "Te poti ni več.",

  // Validation
  errDate: "Izberi datum.",
  errFrom: "Vpiši izhodišče.",
  errTo: "Vpiši cilj.",
  errTooLong: "Besedilo je predolgo.",
  errKm: "Vpiši kilometre.",
  errKmNegative: "Kilometri ne morejo biti negativni.",
  errKmTooMany: "Preveč kilometrov.",
  errTime: "Vpiši uro v obliki 08:30.",
} as const;
