import type { Metadata } from "next";
import Link from "next/link";
import { acceptRecovery } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/app/auth-shell";
import { sl } from "@/lib/i18n/sl";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: sl.auth.recoveryTitle,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function RecoveryPage({ searchParams }: {
  searchParams: Promise<{ token_hash?: string; error?: string }>;
}) {
  const { token_hash, error } = await searchParams;
  const valid = /^(?:[a-f0-9]{56}|[a-f0-9]{64})$/i.test(token_hash ?? "");
  const t = sl.auth;
  return (
    <AuthShell
      title={t.recoveryTitle}
      description={valid && !error ? t.recoveryValid : t.recoveryInvalid}
    >
      {valid && !error ? (
        <form action={acceptRecovery}>
          <input type="hidden" name="token_hash" value={token_hash} />
          <SubmitButton size="lg" className="w-full" pendingText={t.recoveryChecking}>
            {t.recoveryContinue}
          </SubmitButton>
        </form>
      ) : (
        <Button size="lg" className="w-full" render={<Link href="/forgot-password" />}>
          {t.requestNew}
        </Button>
      )}
    </AuthShell>
  );
}
