import Link from "next/link";
import { signIn, signUp } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthAlert, AuthShell } from "@/components/app/auth-shell";
import { PasswordInput } from "@/components/app/password-input";
import { authErrorSl } from "@/lib/i18n/auth-errors";
import { sl } from "@/lib/i18n/sl";

export const metadata = { title: sl.auth.signIn };

// Password sign-in/sign-up via the Server Actions in ./actions.ts (keep those as
// they are). This page only presents them; errors are translated for display.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const { mode, error } = await searchParams;
  const isSignup = mode === "signup";
  const t = sl.auth;
  const message = authErrorSl(error);

  return (
    <AuthShell
      title={isSignup ? t.signUpTitle : t.signInTitle}
      description={isSignup ? t.signUpText : t.signInText}
      footer={
        isSignup ? (
          <>
            {t.haveAccount}{" "}
            <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/login">
              {t.signInLink}
            </Link>
          </>
        ) : (
          <>
            {t.noAccount}{" "}
            <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/login?mode=signup">
              {t.createOne}
            </Link>
          </>
        )
      }
    >
      {message ? <AuthAlert>{message}</AuthAlert> : null}
      <form action={isSignup ? signUp : signIn} className="space-y-5">
        {isSignup ? (
          <div className="space-y-2">
            <Label htmlFor="full_name">{t.name}</Label>
            <Input id="full_name" name="full_name" autoComplete="name" />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">{t.email}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">{t.password}</Label>
            {!isSignup ? (
              <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
                {t.forgot}
              </Link>
            ) : null}
          </div>
          <PasswordInput
            id="password"
            name="password"
            required
            minLength={6}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>
        <SubmitButton size="lg" className="w-full" pendingText={isSignup ? t.signingUp : t.signingIn}>
          {isSignup ? t.signUp : t.signIn}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
