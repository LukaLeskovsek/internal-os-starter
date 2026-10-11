import Link from "next/link";
import { requestRecovery } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({ searchParams }: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>Request a link to choose a new password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? <p role="status">If this email has an account, a reset link has been requested. Open the latest email in this browser.</p> : null}
          {error ? <p role="alert">The reset link could not be requested. Wait a moment and try again.</p> : null}
          <form action={requestRecovery} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" maxLength={254} />
            </div>
            <SubmitButton className="w-full" pendingText="Requesting…">Request reset link</SubmitButton>
          </form>
          <Link className="font-medium underline underline-offset-4" href="/login">Back to sign in</Link>
        </CardContent>
      </Card>
    </main>
  );
}
