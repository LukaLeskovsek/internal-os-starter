"use client";

// Fires a toast from `?ok=…` / `?error=…` query params (set by Server Actions on
// redirect), then strips them so a refresh doesn't re-toast. Render inside <Suspense>.
// Pages that show the error in their own form (INLINE_ERRORS) get no error toast.
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const INLINE_ERRORS = ["/setup-password"];

export function ToastFromParams() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const ok = params.get("ok");
    const error = params.get("error");
    if (!ok && !error) return;
    if (ok) toast.success(ok === "1" ? "Shranjeno." : ok);
    if (error && !INLINE_ERRORS.includes(pathname)) toast.error(error);
    const next = new URLSearchParams(params.toString());
    next.delete("ok");
    next.delete("error");
    router.replace(next.toString() ? `${pathname}?${next}` : pathname);
  }, [params, router, pathname]);

  return null;
}
