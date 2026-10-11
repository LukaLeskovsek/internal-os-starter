// Every word the person reads in this module, in Slovenian. Shared words
// (Shrani, Prekliči, Razveljavi…) come from lib/i18n/sl.ts.
import { plural, type PluralForms } from "@/lib/format";
import type { Kind } from "./types";

export const t = {
  title: "Dopusti",
  monthNav: "Premik po mesecih",
  thisMonth: "Ta mesec",
  tabAbsences: "Odsotnosti",
  tabTeam: "Ekipa",
  tabCalendar: "Koledar",
  tabHolidays: "Prazniki",

  // Calendar
  calendarLabel: "Koledar odsotnosti",
  dragHint: "Povleci pas, da ga premakneš, ali rob, da spremeniš trajanje.",
  barLabel: (name: string, kind: string, range: string) => `${name}: ${kind}, ${range}`,
  newHere: (name: string, day: string) => `Nova odsotnost: ${name}, ${day}`,
  moved: (n: number) => `Odsotnost premaknjena · ${n} ${plural(n, workDaysWord)}.`,
  legendWeekend: "Vikend ali praznik",
  legendCompany: "Dela prost dan podjetja",

  // Holidays
  holidaysTitle: (year: number) => `Prazniki ${year}`,
  yearNav: "Premik po letih",
  publicHoliday: "Državni praznik",
  companyDay: "Podjetje",
  onWeekend: "na vikend",
  addCompanyDay: "Dodaj dela prost dan",
  sheetCompanyDay: "Dela prost dan podjetja",
  sheetCompanyDayDescription: "Kolektivni dopust ali most med prazniki. Ti dnevi se ne štejejo v dopust.",
  companyDayName: "Ime",
  companyDayNamePlaceholder: "npr. Kolektivni dopust",
  saveCompanyDay: "Shrani",
  companyDayCreated: "Dela prost dan dodan. Dnevi odsotnosti so znova prešteti.",
  companyDayDeleted: "Dela prost dan izbrisan.",
  companyDayRestored: "Dela prost dan vrnjen.",
  errCompanyName: "Vpiši ime, npr. Kolektivni dopust.",

  // Absence sheet
  newAbsence: "Nova odsotnost",
  sheetNew: "Nova odsotnost",
  sheetEdit: "Uredi odsotnost",
  sheetDescription: "Izberi osebo in obdobje. Delovne dni preštejemo sami.",
  person: "Oseba",
  personPlaceholder: "Izberi osebo",
  otherPeople: "Ostali",
  kind: "Vrsta",
  from: "Od",
  to: "Do",
  note: "Opomba",
  addNote: "Dodaj opombo",
  saveAbsence: "Shrani odsotnost",
  workDaysLabel: "Delovni dnevi",
  workDaysHint: "Brez vikendov in praznikov",
  noFund: "Ne zmanjša dopusta",
  leftAfter: (n: number, year: number) => `Po tem ostane še ${n} ${plural(n, days)} za ${year}`,
  overBy: (n: number, year: number) => `Preseže dopust za ${year} za ${n} ${plural(n, days)}`,

  // Person sheet
  addPerson: "Dodaj osebo",
  sheetPerson: "Nova oseba",
  sheetPersonEdit: "Uredi osebo",
  sheetPersonDescription: "Ime in koliko dni dopusta ima letos.",
  fullName: "Ime in priimek",
  fullNamePlaceholder: "npr. Ana Novak",
  annualDays: "Dopust na leto",
  annualDaysHint: "Vključi tudi prenesene dni iz lanskega leta.",
  savePerson: "Shrani osebo",

  // Lists
  moreActions: "Več dejanj",
  todayBadge: "Danes",
  monthEmpty: "Ta mesec ni odsotnosti",
  otherMonthEmpty: "V tem mesecu ni odsotnosti",
  monthEmptyText: "Ko ti kdo sporoči dopust ali bolniško, ga vneseš v nekaj sekundah.",
  teamEmpty: "Najprej dodaj ekipo",
  teamEmptyText: "Vpiši ime in koliko dni dopusta ima. Potem vneseš odsotnosti.",
  usedOf: (used: number, total: number) => `Porabljeno ${used} od ${total} ${plural(total, days)}`,
  left: "ostane",
  balanceFor: (year: number) => `dopust za ${year}`,
  overdrawn: "Preseženo",

  // Toasts and errors
  created: "Odsotnost shranjena.",
  updated: "Odsotnost posodobljena.",
  deleted: "Odsotnost izbrisana.",
  restored: "Odsotnost vrnjena.",
  personCreated: "Oseba dodana.",
  personUpdated: "Oseba posodobljena.",
  personDeleted: "Oseba izbrisana.",
  personRestored: "Oseba vrnjena.",
  personHasAbsences: "Oseba ima vnesene odsotnosti, zato je ni mogoče izbrisati.",
  notFound: "Tega vnosa ni več.",
  saveFailed: "Ni bilo mogoče shraniti. Poskusi znova.",
  errPerson: "Izberi osebo.",
  errKind: "Izberi vrsto.",
  errDate: "Izberi datum.",
  errEndBeforeStart: "Konec ne more biti pred začetkom.",
  errTooLong: "Obdobje je predolgo.",
  errNoWorkDays: "V tem obdobju ni delovnih dni.",
  errName: "Vpiši ime.",
  errDays: "Vpiši število dni (0–365).",
  errText: "Besedilo je predolgo.",
} as const;

export const kindLabel: Record<Kind, string> = {
  dopust: "Dopust",
  bolniska: "Bolniška",
  drugo: "Drugo",
};

export const days: PluralForms = { one: "dan", two: "dneva", few: "dnevi", other: "dni" };
export const workDaysWord: PluralForms = {
  one: "delovni dan",
  two: "delovna dneva",
  few: "delovni dnevi",
  other: "delovnih dni",
};
export const absencesWord: PluralForms = {
  one: "odsotnost",
  two: "odsotnosti",
  few: "odsotnosti",
  other: "odsotnosti",
};
export const peopleWord: PluralForms = { one: "oseba", two: "osebi", few: "osebe", other: "oseb" };
