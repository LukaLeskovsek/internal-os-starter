import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { sl } from "@/lib/i18n/sl";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4">
      <EmptyState
        icon={Compass}
        title={sl.errors.notFound}
        className="w-full"
        action={<Button render={<Link href="/home" />}>{sl.errors.backHome}</Button>}
      >
        {sl.errors.notFoundText}
      </EmptyState>
    </main>
  );
}
