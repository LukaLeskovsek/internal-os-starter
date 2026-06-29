// Bundled fixtures — served when the Zoho env vars are empty (mock mode). The
// module always works, key or not (the workshop fallback). Mirrors crm_demo's
// mock-data shape; here a "customer" is a Zoho CRM Account.
export type ZohoCustomer = {
  id: string;
  name: string;
  city?: string;
  phone?: string;
};

export const MOCK_CUSTOMERS: ZohoCustomer[] = [
  { id: "zc-001", name: "Acme d.o.o.", city: "Ljubljana", phone: "+386 1 234 5678" },
  { id: "zc-002", name: "Brio storitve", city: "Maribor", phone: "+386 2 222 3333" },
  { id: "zc-003", name: "Delfin trgovina", city: "Koper", phone: "+386 5 555 6666" },
];
