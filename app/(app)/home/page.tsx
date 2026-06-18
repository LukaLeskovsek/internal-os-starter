import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLauncherModules } from "@/lib/access";
import { Card } from "@/components/ui/card";

// The module launcher: shows ONLY the modules this user is granted AND that are
// enabled, in the owner-defined order. Labels come from the catalogue (DB).
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const modules = await getLauncherModules(supabase, user!.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your tools</h1>
        <p className="mt-1 text-muted">
          Only the modules you&rsquo;ve been granted appear here.
        </p>
      </div>

      {modules.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((m) => (
            <Link key={m.id} href={`/m/${m.id}`}>
              <Card className="transition hover:border-accent">
                <div className="text-2xl">{m.icon}</div>
                <h2 className="mt-2 font-medium">{m.label}</h2>
                <p className="mt-1 text-sm text-muted">{m.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">
          No modules yet. Ask your workspace owner to grant you access.
        </p>
      )}
    </div>
  );
}
