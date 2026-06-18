import { createClient } from "@/lib/supabase/server";
import { isOwner, listUsers } from "@/lib/access";
import {
  setAccess,
  addUser,
  setRole,
  setUserDisabled,
  deleteUser,
  setModuleEnabled,
  renameModule,
  moveModule,
} from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// The management surface — users, modules, and the access grid. Owner-only.
export async function AdminModule() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isOwner(supabase, user.id))) {
    return <p className="text-sm text-muted">Owners only.</p>;
  }

  const users = await listUsers(supabase);
  const { data: modules } = await supabase
    .from("core_modules")
    .select("id, name, enabled, sort_order")
    .order("sort_order", { ascending: true });
  const mods = modules ?? [];
  const { data: grants } = await supabase
    .from("core_user_modules")
    .select("user_id, module_id");
  const grantedSet = new Set(
    (grants ?? []).map((g) => `${g.user_id}:${g.module_id}`),
  );

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Admin</h1>

      {/* ===== Users ===== */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Users</h2>
          <p className="mt-1 text-sm text-muted">
            Add people, change roles, deactivate or remove them.
          </p>
        </div>

        <Card>
          <form action={addUser} className="flex flex-wrap items-end gap-2">
            <div className="min-w-40 flex-1">
              <label className="mb-1 block text-sm">Email</label>
              <Input name="email" type="email" required placeholder="person@company.com" />
            </div>
            <div className="min-w-40 flex-1">
              <label className="mb-1 block text-sm">Temporary password</label>
              <Input name="password" type="text" required minLength={6} placeholder="they can change it later" />
            </div>
            <Button type="submit">Add user</Button>
          </form>
          <p className="mt-2 text-xs text-muted">
            Creates the account immediately (no email sent) — share the temporary password with them.
          </p>
        </Card>

        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4">User</th>
                <th className="pr-4">Email</th>
                <th className="pr-4">Role</th>
                <th className="pr-4">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === user.id;
                return (
                  <tr key={u.id} className="border-t border-border align-middle">
                    <td className="py-2 pr-4">
                      {u.full_name ?? u.id.slice(0, 8)}
                      {isSelf ? " (you)" : ""}
                    </td>
                    <td className="pr-4 text-muted">{u.email ?? "—"}</td>
                    <td className="pr-4">{u.role}</td>
                    <td className="pr-4">
                      {u.disabled ? (
                        <span className="text-red-600">disabled</span>
                      ) : (
                        "active"
                      )}
                    </td>
                    <td className="py-2">
                      {isSelf ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <form action={setRole}>
                            <input type="hidden" name="user_id" value={u.id} />
                            <input type="hidden" name="role" value={u.role === "owner" ? "member" : "owner"} />
                            <Button variant="secondary" type="submit">
                              {u.role === "owner" ? "Make member" : "Make owner"}
                            </Button>
                          </form>
                          <form action={setUserDisabled}>
                            <input type="hidden" name="user_id" value={u.id} />
                            <input type="hidden" name="disabled" value={u.disabled ? "0" : "1"} />
                            <Button variant="secondary" type="submit">
                              {u.disabled ? "Enable" : "Disable"}
                            </Button>
                          </form>
                          <form action={deleteUser}>
                            <input type="hidden" name="user_id" value={u.id} />
                            <Button variant="secondary" type="submit">Delete</Button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ===== Modules ===== */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Modules</h2>
          <p className="mt-1 text-sm text-muted">
            Turn tools on/off, rename them, and set the order they appear on the launcher.
          </p>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4">Module</th>
                <th className="pr-4">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mods.map((m, idx) => (
                <tr key={m.id} className="border-t border-border align-middle">
                  <td className="py-2 pr-4">
                    <form action={renameModule} className="flex items-center gap-2">
                      <input type="hidden" name="module_id" value={m.id} />
                      <Input name="name" defaultValue={m.name} className="w-44" />
                      <Button variant="secondary" type="submit">Rename</Button>
                    </form>
                    <span className="text-xs text-muted">{m.id}</span>
                  </td>
                  <td className="pr-4">
                    {m.enabled ? "on" : <span className="text-red-600">off</span>}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <form action={setModuleEnabled}>
                        <input type="hidden" name="module_id" value={m.id} />
                        <input type="hidden" name="enabled" value={m.enabled ? "0" : "1"} />
                        <Button variant="secondary" type="submit">
                          {m.enabled ? "Disable" : "Enable"}
                        </Button>
                      </form>
                      <form action={moveModule}>
                        <input type="hidden" name="module_id" value={m.id} />
                        <input type="hidden" name="dir" value="up" />
                        <Button variant="secondary" type="submit" disabled={idx === 0}>↑</Button>
                      </form>
                      <form action={moveModule}>
                        <input type="hidden" name="module_id" value={m.id} />
                        <input type="hidden" name="dir" value="down" />
                        <Button variant="secondary" type="submit" disabled={idx === mods.length - 1}>↓</Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ===== Access grid ===== */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Access</h2>
          <p className="mt-1 text-sm text-muted">
            Who can see which module. Changes apply on their next page load.
          </p>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4">User</th>
                {mods.map((m) => (
                  <th key={m.id} className="px-3 text-center font-medium">{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-2 pr-4">
                    {u.full_name ?? u.email ?? u.id.slice(0, 8)}{" "}
                    <span className="text-muted">({u.role})</span>
                  </td>
                  {mods.map((m) => {
                    const on = grantedSet.has(`${u.id}:${m.id}`);
                    return (
                      <td key={m.id} className="px-3 text-center">
                        <form action={setAccess}>
                          <input type="hidden" name="user_id" value={u.id} />
                          <input type="hidden" name="module_id" value={m.id} />
                          <input type="hidden" name="grant" value={on ? "0" : "1"} />
                          <button
                            type="submit"
                            aria-label={`${on ? "Revoke" : "Grant"} ${m.name}`}
                            className={`h-5 w-5 rounded border text-xs leading-none ${
                              on ? "border-accent bg-accent text-accent-foreground" : "border-border"
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
      </section>
    </div>
  );
}
