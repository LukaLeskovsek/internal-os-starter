// Server-side Zoho CRM client (READ-ONLY) — modeled on modules/crm_demo/lib/intrix.ts.
//
// Slice 1 reads Accounts (customers) so the office can attach one to a work order.
// Writing back to Zoho (a work order on completion) is a LATER slice and needs
// explicit owner approval (the repo's read-before-write rule).
//
// If ZOHO_ACCESS_TOKEN / ZOHO_API_DOMAIN are unset, it serves bundled mock data
// and flags `mock: true` — so the module always works without credentials.
//
// NOTE: Zoho's real auth is OAuth (a refresh token minted into short-lived access
// tokens). For slice 1 we read a token from env to keep the wiring identical to
// intrix.ts; the refresh-token exchange is wired in the integration slice. The
// endpoint/response shapes below are ASSUMED — confirm against the Zoho CRM v6 API.
import { MOCK_CUSTOMERS, type ZohoCustomer } from "./mock-data";

const DOMAIN = process.env.ZOHO_API_DOMAIN; // e.g. https://www.zohoapis.eu
const TOKEN = process.env.ZOHO_ACCESS_TOKEN;

function authHeaders() {
  return { Authorization: `Zoho-oauthtoken ${TOKEN}` };
}

// Zoho Accounts → our ZohoCustomer shape. Defensive: fields may be missing.
type ZohoAccount = {
  id: string;
  Account_Name?: string;
  Billing_City?: string;
  Phone?: string;
};

export async function listCustomers(): Promise<{
  customers: ZohoCustomer[];
  mock: boolean;
}> {
  if (!TOKEN || !DOMAIN) {
    return { customers: MOCK_CUSTOMERS, mock: true };
  }
  const res = await fetch(
    `${DOMAIN}/crm/v6/Accounts?fields=Account_Name,Billing_City,Phone&per_page=200`,
    { headers: authHeaders(), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Zoho request failed: ${res.status}`);
  const data = (await res.json()) as { data?: ZohoAccount[] };
  const customers = (data.data ?? []).map((a) => ({
    id: a.id,
    name: a.Account_Name ?? "(brez imena)",
    city: a.Billing_City,
    phone: a.Phone,
  }));
  return { customers, mock: false };
}
