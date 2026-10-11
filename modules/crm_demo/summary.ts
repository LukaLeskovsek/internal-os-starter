// Home tile status line. Never calls the external API (Home must stay fast):
// with a live Intrix key we show nothing; in demo mode we count the sample data.
import "server-only";
import type { ModuleSummary } from "@/lib/modules";
import { count } from "@/lib/format";
import { MOCK_CONTACTS } from "./lib/mock-data";

export async function summary(): Promise<ModuleSummary> {
  if (process.env.INTRIX_API_KEY) return null;
  return {
    text: `${count(MOCK_CONTACTS.length, { one: "kontakt", two: "kontakta", few: "kontakti", other: "kontaktov" })} (demo)`,
    tone: "neutral",
  };
}
