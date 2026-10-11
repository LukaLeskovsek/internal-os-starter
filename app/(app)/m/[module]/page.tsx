import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock, PowerOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { userCanAccess, moduleIsEnabled } from "@/lib/access";
import { getModule } from "@/modules/_registry";
import type { ModuleSearchParams } from "@/lib/modules";
import { AdminModule } from "@/modules/admin/pages";
import { CrmDemoModule } from "@/modules/crm_demo/pages";
import { AiAssistModule } from "@/modules/ai_assist/pages";
import { InvoiceOcrModule } from "@/modules/invoice_ocr/pages";
import { WorkOrdersModule } from "@/modules/work_orders/pages";
import { TravelOrdersModule } from "@/modules/travel_orders/pages";
import { LeaveModule } from "@/modules/leave/pages";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { sl } from "@/lib/i18n/sl";

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }) {
  const def = getModule((await params).module);
  return { title: def?.name };
}

// The single module router. One guard, one place: access is enforced HERE,
// server-side, on every request — a member cannot reach a module by URL.
// Keep the guard as it is. Add new modules to the switch below.
export default async function ModuleRouter({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<ModuleSearchParams>;
}) {
  const { module } = await params;
  const sp = await searchParams;

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
      <EmptyState
        icon={Lock}
        title={sl.errors.noAccess}
        action={<Button render={<Link href="/home" />}>{sl.errors.backHome}</Button>}
      >
        {sl.errors.noAccessText}
      </EmptyState>
    );
  }

  // A module the owner has switched off is blocked even for granted users.
  if (!(await moduleIsEnabled(supabase, module))) {
    return (
      <EmptyState
        icon={PowerOff}
        title={sl.errors.moduleOff}
        action={<Button render={<Link href="/home" />}>{sl.errors.backHome}</Button>}
      >
        {sl.errors.moduleOffText}
      </EmptyState>
    );
  }

  switch (module) {
    case "admin":
      return <AdminModule searchParams={sp} />;
    case "crm_demo":
      return <CrmDemoModule searchParams={sp} />;
    case "ai_assist":
      return <AiAssistModule searchParams={sp} />;
    case "invoice_ocr":
      return <InvoiceOcrModule searchParams={sp} />;
    case "work_orders":
      return <WorkOrdersModule searchParams={sp} />;
    case "travel_orders":
      return <TravelOrdersModule searchParams={sp} />;
    case "leave":
      return <LeaveModule searchParams={sp} />;
    default:
      notFound();
  }
}
