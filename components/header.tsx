import Link from "next/link";
import { brand } from "@/config/brand";
import { CommandPalette, type PaletteItem } from "@/components/app/command-palette";
import { ModuleSwitcher, type SwitcherModule } from "@/components/app/module-switcher";
import { UserMenu } from "@/components/app/user-menu";

export function Header({
  name,
  email,
  modules,
  palette,
}: {
  name: string;
  email?: string;
  modules: SwitcherModule[];
  palette: PaletteItem[];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/home" className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-xs">
            {brand.name.charAt(0)}
          </span>
          <span className="max-md:hidden">{brand.name}</span>
        </Link>
        <div className="min-w-0 flex-1">
          <ModuleSwitcher modules={modules} />
        </div>
        <CommandPalette items={palette} />
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}
