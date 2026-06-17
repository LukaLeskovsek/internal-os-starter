// The module registry — the single list of tool-modules in this app.
// Keep it in sync with the core_modules table (seed in supabase/migrations).
// Adding a module: add an entry here, a core_modules row, the modules/<id>/
// folder, and a case in app/m/[module]/page.tsx. Use /scaffold-module.
export type ModuleDef = {
  id: string; // lowercase snake_case — also the database table prefix
  name: string;
  description: string;
  icon: string; // emoji, shown on the launcher
};

export const MODULES: ModuleDef[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Manage which users can see which modules.",
    icon: "⚙️",
  },
  {
    id: "crm_demo",
    name: "CRM (demo)",
    description: "Contacts pulled from Intrix — read-only.",
    icon: "📇",
  },
];

export function getModule(id: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === id);
}
