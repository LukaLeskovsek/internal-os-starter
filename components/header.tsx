import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function Header({ email }: { email?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link href="/home" className="font-semibold">
        Internal OS
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {email ? <span className="text-muted">{email}</span> : null}
        <form action={signOut}>
          <Button variant="secondary" type="submit">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
