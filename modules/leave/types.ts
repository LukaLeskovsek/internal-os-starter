// Shapes shared by the server page and the client sheets.

export const KINDS = ["dopust", "bolniska", "drugo"] as const;
export type Kind = (typeof KINDS)[number];

export type Person = {
  id: string;
  full_name: string;
  annual_days: number;
  created_at: string;
};

export type Absence = {
  id: string;
  person_id: string;
  kind: Kind;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  work_days: number;
  note: string | null;
  created_at: string;
};

/** What the absence sheet needs to guess well. Computed on the server. */
export type AbsenceDefaults = {
  today: string; // YYYY-MM-DD in Ljubljana
  start: string; // today, or the next work day on a weekend / holiday
  year: number; // the year the balance is for
  people: { id: string; name: string }[]; // everyone, A–Ž
  recentPeople: string[]; // ids, most recently entered first
  remaining: Record<string, number>; // person id → leave days left this year
};
