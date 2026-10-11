import type { ModuleProps } from "@/lib/modules";
import { KeyRound, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isOwner, listUsers, moduleLabel } from "@/lib/access";
import { getModule } from "@/modules/_registry";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { ModuleIcon } from "@/components/app/module-icon";
import { AddPersonSheet } from "./add-person-sheet";
import { AdminTabs } from "./admin-tabs";
import { UsersPanel } from "./users-panel";
import { ModulesPanel, type ModuleItem } from "./modules-panel";
import { AccessPanel } from "./access-panel";
import { parseTab } from "./tabs";
import { s } from "./strings";

// The management surface: people, tools and who can open what. Owner-only
// (the actions re-check it server-side; this check only picks what to render).
export async function AdminModule({ searchParams }: ModuleProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isOwner(supabase, user.id))) {
    return (
      <EmptyState icon={ShieldAlert} title={s.ownersOnlyTitle}>
        {s.ownersOnlyText}
      </EmptyState>
    );
  }

  const [users, { data: modules }, { data: grants }] = await Promise.all([
    listUsers(supabase),
    supabase.from("core_modules").select("id, name, enabled, sort_order").order("sort_order", { ascending: true }),
    supabase.from("core_user_modules").select("user_id, module_id"),
  ]);

  // Friendly names first: the owner's label, else the registry name. Never a raw id.
  // Rows with no code behind them (a removed module) are listed apart, muted.
  const items: ModuleItem[] = [];
  const notInstalled: string[] = [];
  for (const m of modules ?? []) {
    const def = getModule(m.id as string);
    if (!def) {
      notInstalled.push(m.id as string);
      continue;
    }
    items.push({
      id: def.id,
      label: moduleLabel(m.name as string | null, def),
      description: def.description,
      enabled: m.enabled === true,
      icon: <ModuleIcon icon={def.icon} size="sm" />,
    });
  }
  const granted = (grants ?? []).map((g) => `${g.user_id}:${g.module_id}`);
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div>
      <PageHeader
        title={s.title}
        description={s.description}
        actions={
          <AddPersonSheet
            defaultOpen={searchParams.nov === "1"}
            modules={items.filter((m) => m.id !== "admin").map(({ id, label, icon }) => ({ id, label, icon }))}
          />
        }
      />

      {hasServiceKey ? null : (
        <div className="mb-6 flex gap-3 rounded-2xl bg-warning/15 p-4">
          <KeyRound className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">{s.missingKeyTitle}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{s.missingKeyText}</p>
          </div>
        </div>
      )}

      <AdminTabs
        tab={parseTab(searchParams.tab)}
        labels={{ uporabniki: s.tabs.users, orodja: s.tabs.modules, dostopi: s.tabs.access }}
        panels={{
          uporabniki: <UsersPanel users={users} selfId={user.id} />,
          orodja: <ModulesPanel modules={items} notInstalled={notInstalled} />,
          dostopi: (
            <AccessPanel
              users={users}
              modules={items.map(({ id, label, icon }) => ({ id, label, icon }))}
              granted={granted}
              selfId={user.id}
            />
          ),
        }}
      />
    </div>
  );
}
