// The frame around sign-in, password reset and setup: a warm brand panel on
// large screens, just the card on phones.
import type { ReactNode } from "react";
import { brand } from "@/config/brand";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-foreground/15 text-xl font-bold">
            {brand.name.charAt(0)}
          </span>
          {brand.name}
        </div>
        <div className="relative z-10 max-w-md">
          <p className="text-4xl leading-tight font-semibold tracking-tight text-balance">{brand.tagline}</p>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-primary-foreground/10" />
        <div aria-hidden className="pointer-events-none absolute right-32 bottom-40 size-40 rounded-full bg-primary-foreground/10" />
      </aside>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 font-semibold lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-primary font-bold text-primary-foreground">
              {brand.name.charAt(0)}
            </span>
            {brand.name}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}

export function AuthAlert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "ok" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "mb-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
          : "mb-5 rounded-xl bg-success/12 px-4 py-3 text-sm text-success"
      }
    >
      {children}
    </p>
  );
}
