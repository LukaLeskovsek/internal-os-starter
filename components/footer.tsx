import { brand } from "@/config/brand";

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pt-10 pb-24 text-center text-sm text-muted-foreground sm:px-6 sm:pb-10">
      {brand.footer}
    </footer>
  );
}
