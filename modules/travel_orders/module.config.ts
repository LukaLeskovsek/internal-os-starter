// Per-module config. Mirrors the registry entry; modules read their own config,
// never another module's.
export const config = {
  id: "travel_orders",
  name: "Potni nalogi",
  description:
    "Vneseš službeno pot (stranka, relacija, km, čas) in modul izračuna povračilo kilometrine (km × 0,43 €).",
};
