import { createClient } from "@/lib/supabase/server";
import { isOwner, type Profile } from "@/lib/access";
import { MODULES } from "@/modules/_registry";
import { setAccess } from "./actions";
import { Card } from "@/components/ui/card";

// The management surface — the difference between a toy and a company system.
// A checkbox grid of user × module; toggling grants/revokes access.
export async function AdminModule() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isOwner(supabase, user.id))) {
    return <p className="text-sm text-muted">Owners only.</p>;
  }

  const { data: profiles } = await supabase
    .from("core_profiles")
    .select("id, full_name, role")
    .order("created_at", { ascending: true });
  const { data: grants } = await supabase
    .from("core_user_modules")
    .select("user_id, module_id");

  const grantedSet = new Set(
    (grants ?? []).map((g) => `${g.user_id}:${g.module_id}`),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-muted">
          Toggle which user can see which module. New users sign up themselves;
          you grant them access here. Changes apply on their next page load.
        </p>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-4">User</th>
              {MODULES.map((m) => (
                <th key={m.id} className="px-3 text-center font-medium">
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {((profiles as Profile[] | null) ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="py-2 pr-4">
                  {p.full_name ?? p.id.slice(0, 8)}{" "}
                  <span className="text-muted">({p.role})</span>
                </td>
                {MODULES.map((m) => {
                  const on = grantedSet.has(`${p.id}:${m.id}`);
                  return (
                    <td key={m.id} className="px-3 text-center">
                      <form action={setAccess}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <input type="hidden" name="module_id" value={m.id} />
                        <input type="hidden" name="grant" value={on ? "0" : "1"} />
                        <button
                          type="submit"
                          aria-label={`${on ? "Revoke" : "Grant"} ${m.name}`}
                          className={`h-5 w-5 rounded border text-xs leading-none ${
                            on
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border"
                          }`}
                        >
                          {on ? "✓" : ""}
                        </button>
                      </form>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
