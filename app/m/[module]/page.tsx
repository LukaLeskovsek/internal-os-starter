import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userCanAccess, moduleIsEnabled } from "@/lib/access";
import { getModule } from "@/modules/_registry";
import { AdminModule } from "@/modules/admin/pages";
import { CrmDemoModule } from "@/modules/crm_demo/pages";
import { Card } from "@/components/ui/card";

// The single module router. One guard, one place: access is enforced HERE,
// server-side, on every request — a member cannot reach a module by URL.
// DONE — do not modify the guard. Add new modules to the switch below.
export default async function ModuleRouter({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { module } = await params;
  const { id } = await searchParams;

  const def = getModule(module);
  if (!def) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allowed = await userCanAccess(supabase, user.id, module);
  if (!allowed) {
    return (
      <Card>
        <h1 className="text-lg font-medium">No access</h1>
        <p className="mt-1 text-sm text-muted">
          You don&rsquo;t have access to &ldquo;{def.name}&rdquo;. Ask your
          workspace owner to grant it in Admin.
        </p>
      </Card>
    );
  }

  // A module the owner has switched off is blocked even for granted users.
  if (!(await moduleIsEnabled(supabase, module))) {
    return (
      <Card>
        <h1 className="text-lg font-medium">Unavailable</h1>
        <p className="mt-1 text-sm text-muted">
          &ldquo;{def.name}&rdquo; is currently turned off by your workspace owner.
        </p>
      </Card>
    );
  }

  switch (module) {
    case "admin":
      return <AdminModule />;
    case "crm_demo":
      return <CrmDemoModule selectedId={id} />;
    default:
      notFound();
  }
}
