import Link from "next/link";
import { signIn, signUp } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// DONE — do not modify this flow. Password sign-in/sign-up via Server Actions.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const { mode, error } = await searchParams;
  const isSignup = mode === "signup";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Card>
        <h1 className="text-2xl font-semibold">
          {isSignup ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {isSignup ? "Use your email and a password." : "Welcome back."}
        </p>

        {error ? (
          <p className="mt-4 rounded-md border border-border p-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <form action={isSignup ? signUp : signIn} className="mt-6 space-y-4">
          {isSignup ? (
            <div>
              <label className="mb-1 block text-sm" htmlFor="full_name">
                Name
              </label>
              <Input id="full_name" name="full_name" type="text" autoComplete="name" />
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-sm" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </div>
          <Button type="submit" className="w-full">
            {isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link className="text-accent" href="/login">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link className="text-accent" href="/login?mode=signup">
                Create an account
              </Link>
            </>
          )}
        </p>
      </Card>
    </main>
  );
}
