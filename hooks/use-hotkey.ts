"use client";

// Single-key shortcuts (N = new, J/K = next/prev, A/R = approve/reject…).
// Ignored while typing in an input, and when a modifier key is held.
import { useEffect, useRef } from "react";

export function useHotkey(
  key: string | undefined,
  handler: (e: KeyboardEvent) => void,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!key || !enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // While a dialog/sheet is open, it owns the keyboard (incl. Escape).
      if (document.querySelector("[role=dialog]")) return;
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        ref.current(e);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, enabled]);
}
