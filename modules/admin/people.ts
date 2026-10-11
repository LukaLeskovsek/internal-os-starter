// How a person is shown across the admin tabs.
import type { Profile } from "@/lib/access";

type Person = Pick<Profile, "full_name" | "email">;

export function displayName(p: Person): string {
  return p.full_name?.trim() || p.email || "—";
}

export function initials(p: Person): string {
  const name = p.full_name?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase();
  }
  return (p.email?.[0] ?? "?").toUpperCase();
}
