import { setPassword } from "./actions";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordInput } from "@/components/app/password-input";
import { AuthAlert } from "@/components/app/auth-shell";
import { authErrorSl } from "@/lib/i18n/auth-errors";
import { sl } from "@/lib/i18n/sl";

export const metadata = { title: sl.auth.setupTitle };

export default async function SetupPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const t = sl.auth;

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl bg-card p-6 shadow-xs ring-1 ring-foreground/8 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t.setupTitle}</h1>
        <p className="mt-1.5 text-muted-foreground">{t.setupText}</p>
        <div className="mt-6">
          {error ? <AuthAlert>{authErrorSl(error)}</AuthAlert> : null}
          <form action={setPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">{t.newPassword}</Label>
              <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">{t.confirmPassword}</Label>
              <PasswordInput id="confirm" name="confirm" required minLength={8} autoComplete="new-password" />
            </div>
            <SubmitButton size="lg" className="w-full" pendingText={sl.common.saving}>
              {t.setupSave}
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
