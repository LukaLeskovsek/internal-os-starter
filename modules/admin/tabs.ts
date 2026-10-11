// The admin tabs and their ?tab= values. Plain module: used by the server page
// and the client tabs alike.
export type AdminTab = "uporabniki" | "orodja" | "dostopi";

/** ?tab= → a known tab ("moduli" is an alias for "orodja"). */
export function parseTab(value: string | null | undefined): AdminTab {
  if (value === "orodja" || value === "moduli") return "orodja";
  if (value === "dostopi") return "dostopi";
  return "uporabniki";
}
