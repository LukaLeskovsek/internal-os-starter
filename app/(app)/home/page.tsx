import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getGrantedModuleIds } from "@/lib/access";
import { getModule, type ModuleDef } from "@/modules/_registry";
import { Card } from "@/components/ui/card";

// The module launcher: shows ONLY the modules this user has been granted.
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const grantedIds = await getGrantedModuleIds(supabase, user!.id);
  const granted = grantedIds
    .map(getModule)
    .filter((m): m is ModuleDef => Boolean(m));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your tools</h1>
        <p className="mt-1 text-muted">
          Only the modules you&rsquo;ve been granted appear here.
        </p>
      </div>

      {granted.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {granted.map((m) => (
            <Link key={m.id} href={`/m/${m.id}`}>
              <Card className="transition hover:border-accent">
                <div className="text-2xl">{m.icon}</div>
                <h2 className="mt-2 font-medium">{m.name}</h2>
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
