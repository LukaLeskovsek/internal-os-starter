// Every word the work_orders module shows, plus the status lifecycle. Shared
// words (Shrani, Razveljavi…) come from sl.common in lib/i18n/sl.ts.
import type { Tone } from "@/components/app/status-badge";
import type { PluralForms } from "@/lib/format";

export type Status = "odprt" | "v_delu" | "zakljucen";
export const STATUSES: Status[] = ["odprt", "v_delu", "zakljucen"];

/** Label, badge tone and the inline "next step" button for each status. */
export const STATUS: Record<Status, { label: string; tone: Tone; next?: { to: Status; label: string } }> = {
  odprt: { label: "Odprt", tone: "info", next: { to: "v_delu", label: "Začni" } },
  v_delu: { label: "V delu", tone: "attention", next: { to: "zakljucen", label: "Zaključi" } },
  zakljucen: { label: "Zaključen", tone: "good" },
};

export type Filter = "moji" | "odprti" | "v_delu" | "zakljuceni";
export const FILTERS: { value: Filter; label: string }[] = [
  { value: "moji", label: "Moji" },
  { value: "odprti", label: "Odprti" },
  { value: "v_delu", label: "V delu" },
  { value: "zakljuceni", label: "Zaključeni" },
];

export const orders: PluralForms = {
  one: "nalog",
  two: "naloga",
  few: "nalogi",
  other: "nalogov",
};

export const t = {
  title: "Delovni nalogi",
  description: "Pisarna dodeli nalog, teren ga na telefonu zaključi.",
  newOrder: "Nov nalog",

  // Empty states per filter
  emptyMine: "Nimaš odprtih nalogov",
  emptyMineText: "Ko ti kdo dodeli nalog, se prikaže tukaj.",
  emptyOpen: "Ni odprtih nalogov",
  emptyOpenText: "Vse je razdeljeno. Nov nalog ustvariš v nekaj sekundah.",
  emptyInProgress: "Nič ni v delu",
  emptyInProgressText: "Ko izvajalec začne nalog, se prikaže tukaj.",
  emptyDone: "Še ni zaključenih nalogov",
  emptyDoneText: "Zaključeni nalogi ostanejo tukaj za pregled.",

  // People
  you: "Ti",
  unassigned: "Ni dodeljen",
  formerColleague: "Nekdanji sodelavec",
  noCustomer: "Brez stranke",

  // New order sheet
  sheetDescription: "Izvajalec ga takoj vidi na svojem seznamu.",
  orderTitle: "Kaj je treba narediti?",
  orderTitlePlaceholder: "npr. Servis klime, 2. nadstropje",
  customer: "Stranka",
  customerPlaceholder: "Poišči stranko…",
  customerEmpty: "Ni takšne stranke.",
  recentCustomer: "nedavno",
  assignee: "Izvajalec",
  assigneePlaceholder: "Izberi izvajalca",
  addDescription: "Dodaj opis",
  descriptionLabel: "Opis",
  descriptionPlaceholder: "Podrobnosti, navodila za teren…",
  create: "Ustvari nalog",

  // Detail sheet
  status: "Status",
  details: "Podrobnosti",
  createdBy: "Ustvaril",
  createdAt: "Ustvarjen",
  onlyCreatorReassigns: "Izvajalca lahko spremeni samo ustvarjalec naloga.",
  saveChanges: "Shrani spremembe",
  deleteOrder: "Izbriši nalog",
  deleteConfirmTitle: "Izbrišem ta nalog?",
  deleteConfirmText: "Nalog bo izbrisan za vse. Tega ni mogoče razveljaviti.",
  notFound: "Tega naloga ni",
  notFoundText: "Morda je bil izbrisan ali ti ni več dodeljen.",

  // Results
  created: "Nalog ustvarjen.",
  updated: "Nalog posodobljen.",
  reassigned: "Izvajalec spremenjen.",
  deleted: "Nalog izbrisan.",
  statusTo: (label: string) => `Status: ${label}.`,

  // Errors
  errTitle: "Vpiši, kaj je treba narediti.",
  errTooLong: "Besedilo je predolgo.",
  errAssignee: "Izberi izvajalca.",
  errAssigneeNoAccess: "Ta oseba nima dostopa do delovnih nalogov.",
  errCustomer: "Te stranke ni na seznamu.",
  errNotFound: "Tega naloga ni več.",
  errOnlyCreatorDeletes: "Nalog lahko izbriše samo tisti, ki ga je ustvaril.",
  errOnlyCreatorReassigns: "Izvajalca lahko spremeni samo ustvarjalec naloga.",
} as const;
