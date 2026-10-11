// Shapes shared by the server page and the client sheets.

export type Trip = {
  id: string;
  customer: string | null;
  trip_date: string; // YYYY-MM-DD
  route_from: string;
  route_to: string;
  km: number;
  departed_at: string | null; // HH:MM
  arrived_at: string | null; // HH:MM
  rate: number;
  amount: number;
  created_at: string;
};

/** A route the user drove recently: one tap fills the sheet. */
export type RecentRoute = {
  from: string;
  to: string;
  km: number;
  customer: string | null;
};

/** What the sheet needs to offer good defaults. Computed on the server. */
export type TripDefaults = {
  today: string; // YYYY-MM-DD in Ljubljana
  yesterday: string;
  origin: string; // the user's most frequent starting point
  routes: RecentRoute[];
  customers: string[]; // recent customers, for the input's suggestions
};
