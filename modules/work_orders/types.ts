// Shapes the server page hands to the client components. Labels (names, dates)
// are resolved on the server, so client components only render.
import type { Status } from "./strings";

export type WorkOrder = {
  id: string;
  user_id: string;
  assignee_id: string | null;
  zoho_customer_id: string | null;
  customer_name: string | null;
  title: string;
  description: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
};

/** One row in the list. */
export type OrderRowData = {
  id: string;
  title: string;
  status: Status;
  meta: string; // "Acme d.o.o. · Ti · včeraj"
  href: string; // opens the detail sheet, keeps the filter
};

/** Option for the assignee Select. */
export type PersonOption = { value: string; label: string };

/** Option for the customer Combobox. `recent` ones are listed first. */
export type CustomerOption = { value: string; label: string; city?: string; recent?: boolean };
