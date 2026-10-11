export type Item = {
  id: string;
  title: string;
  note: string | null;
  item_date: string; // YYYY-MM-DD
  created_at: string;
};

/** What the sheet can guess from the person's own history. */
export type ItemDefaults = { today: string; yesterday: string; recentTitles: string[] };
