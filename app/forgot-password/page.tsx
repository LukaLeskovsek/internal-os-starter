import Link from "next/link";
import { requestRecovery } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthAlert, AuthShell } from "@/components/app/auth-shell";
import { authErrorSl } from "@/lib/i18n/auth-errors";
import { sl } from "@/lib/i18n/sl";

export const dynamic = "force-dynamic";
export const metadata = { title: sl.auth.forgotTitle };

export default async function ForgotPasswordPage({ searchParams }: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  const t = sl.auth;
  return (
    <AuthShell
      title={t.forgotTitle}
      description={t.forgotText}
      footer={
        <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/login">
          {t.backToSignIn}
        </Link>
      }
    >
      {sent ? <AuthAlert tone="ok">{t.forgotSent}</AuthAlert> : null}
      {error ? <AuthAlert>{authErrorSl(error)}</AuthAlert> : null}
      <form action={requestRecovery} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">{t.email}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" maxLength={254} autoFocus />
        </div>
        <SubmitButton size="lg" className="w-full" pendingText={t.forgotSending}>
          {t.forgotSend}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
