import type { Metadata } from "next";
import Link from "next/link";
import { acceptRecovery } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Reset password · Internal OS",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function RecoveryPage({ searchParams }: {
  searchParams: Promise<{ token_hash?: string; error?: string }>;
}) {
  const { token_hash, error } = await searchParams;
  const valid = /^(?:[a-f0-9]{56}|[a-f0-9]{64})$/i.test(token_hash ?? "");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            {valid && !error
              ? "Continue to choose a new password. This link can only be used once."
              : "This link is invalid or has expired. Request a new link and use the latest one."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {valid && !error ? (
            <form action={acceptRecovery}>
              <input type="hidden" name="token_hash" value={token_hash} />
              <SubmitButton className="w-full" pendingText="Checking link…">
                Continue to reset password
              </SubmitButton>
            </form>
          ) : (
            <Link className="font-medium underline underline-offset-4" href="/forgot-password">
              Request a new link
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
