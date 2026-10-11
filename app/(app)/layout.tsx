import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLauncherModules, getProfile } from "@/lib/access";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { PaletteItem } from "@/components/app/command-palette";
import { ModuleIcon } from "@/components/app/module-icon";
import { ToastFromParams } from "@/components/toast-from-params";

// Auth guard for the whole signed-in area. Keep the two checks below as they are.
// MODULE access is enforced separately, per request, in app/(app)/m/[module]/page.tsx.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // A deactivated user keeps a session but can't reach any app route.
  const profile = await getProfile(supabase, user.id);
  if (profile?.disabled) {
    redirect("/login?error=disabled");
  }

  // Only modules this user may open feed the switcher and ⌘K.
  const modules = await getLauncherModules(supabase, user.id);
  const palette: PaletteItem[] = modules.flatMap((m) => [
    {
      group: "goTo" as const,
      label: m.label,
      href: `/m/${m.id}`,
      icon: <ModuleIcon icon={m.def.icon} size="sm" />,
      keywords: m.def.keywords,
    },
    ...[m.def.primaryAction, ...(m.def.actions ?? [])]
      .filter((a) => !!a)
      .map((a) => ({
        group: "actions" as const,
        label: a.label,
        href: a.href,
        icon: <ModuleIcon icon={m.def.icon} size="sm" />,
        keywords: [m.label, ...(m.def.keywords ?? [])],
      })),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        name={profile?.full_name || user.email || ""}
        email={user.email}
        modules={modules.map((m) => ({ id: m.id, label: m.label, icon: <ModuleIcon icon={m.def.icon} size="sm" /> }))}
        palette={palette}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <Footer />
      {/* Legacy ?ok=/?error= toasts (setup-password redirect). New code returns ActionResult. */}
      <Suspense>
        <ToastFromParams />
      </Suspense>
    </div>
  );
}
