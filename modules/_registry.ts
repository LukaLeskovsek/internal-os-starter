// The module registry — the one list the app shell reads. Code owns: id, icon,
// the default name/description, the primary action and the tile summary. The DB
// (core_modules) owns the live label, the on/off switch and the order — owners
// change those in Administracija.
//
// Adding a module: use /scaffold-module. It adds an entry here, a core_modules
// row, the modules/<id>/ folder and a case in app/(app)/m/[module]/page.tsx.
//
// Icons: pick one at lucide.dev/icons and import it by name below.
import {
  CarFront,
  ContactRound,
  ReceiptText,
  Settings2,
  Sparkles,
  TreePalm,
  Wrench,
} from "lucide-react";
import type { ModuleDef } from "@/lib/modules";

export type { ModuleDef } from "@/lib/modules";

export const MODULES: ModuleDef[] = [
  {
    id: "invoice_ocr",
    name: "Računi",
    description: "Naloži račun, AI ga prebere, ti ga potrdiš.",
    icon: ReceiptText,
    keywords: ["likvidacija", "faktura", "ocr", "plačilo"],
    primaryAction: { label: "Naloži račune", href: "/m/invoice_ocr?nov=1" },
    actions: [{ label: "Izvozi račune (CSV)", href: "/api/invoice_ocr/export" }],
    summary: () => import("./invoice_ocr/summary"),
  },
  {
    id: "work_orders",
    name: "Delovni nalogi",
    description: "Pisarna dodeli nalog, teren ga na telefonu zaključi.",
    icon: Wrench,
    keywords: ["nalog", "servis", "teren", "dodeli"],
    primaryAction: { label: "Nov nalog", href: "/m/work_orders?nov=1" },
    summary: () => import("./work_orders/summary"),
  },
  {
    id: "travel_orders",
    name: "Potni nalogi",
    description: "Vpiši pot v nekaj sekundah, kilometrino izračuna samo.",
    icon: CarFront,
    keywords: ["pot", "kilometrina", "km", "potni"],
    primaryAction: { label: "Nova pot", href: "/m/travel_orders?nov=1" },
    summary: () => import("./travel_orders/summary"),
  },
  {
    id: "leave",
    name: "Dopusti",
    description: "Vnesi odsotnost v nekaj sekundah, dneve preštejemo sami.",
    icon: TreePalm,
    keywords: ["dopust", "bolniška", "odsotnost", "prost dan", "ekipa", "koledar", "praznik"],
    primaryAction: { label: "Nova odsotnost", href: "/m/leave?nov=1" },
    actions: [
      { label: "Koledar odsotnosti", href: "/m/leave?tab=koledar" },
      { label: "Dodaj osebo", href: "/m/leave?tab=ekipa&nov=1" },
      { label: "Dodaj dela prost dan", href: "/m/leave?tab=prazniki&nov=1" },
    ],
    summary: () => import("./leave/summary"),
  },
  {
    id: "ai_assist",
    name: "AI pomočnik",
    description: "Vprašaj karkoli, dobi kratek odgovor ali osnutek.",
    icon: Sparkles,
    keywords: ["ai", "vprašaj", "claude", "osnutek"],
    primaryAction: { label: "Vprašaj", href: "/m/ai_assist" },
  },
  {
    id: "crm_demo",
    name: "Kontakti",
    description: "Najdi telefon ali e-pošto stranke v dveh sekundah.",
    icon: ContactRound,
    keywords: ["crm", "stranka", "telefon", "intrix"],
    primaryAction: { label: "Poišči kontakt", href: "/m/crm_demo" },
    summary: () => import("./crm_demo/summary"),
  },
  {
    id: "admin",
    name: "Administracija",
    description: "Dodaj sodelavce in jim odpri prava orodja.",
    icon: Settings2,
    keywords: ["uporabniki", "dostop", "admin", "moduli"],
    primaryAction: { label: "Dodaj osebo", href: "/m/admin?tab=uporabniki&nov=1" },
    summary: () => import("./admin/summary"),
  },
];

export function getModule(id: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === id);
}
