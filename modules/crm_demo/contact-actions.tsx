"use client";

// Call / write / copy for one contact — inline on rows, full-size in the detail.
import { Copy, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { sl } from "@/lib/i18n/sl";
import { cn } from "@/lib/utils";
import type { Contact } from "./lib/mock-data";
import { s } from "./strings";

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export function contactText(c: Contact): string {
  return [c.name, c.company, c.phone, c.email].filter(Boolean).join("\n");
}

async function copyContact(c: Contact) {
  try {
    await navigator.clipboard.writeText(contactText(c));
    toast.success(s.copied);
  } catch {
    toast.error(sl.errors.generic);
  }
}

/** Icon buttons for a list row. */
export function RowActions({ contact }: { contact: Contact }) {
  const icon = cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground hover:text-foreground");
  return (
    <>
      {contact.phone ? (
        <a href={telHref(contact.phone)} className={icon} aria-label={`${s.call}: ${contact.name}`} title={s.call}>
          <Phone />
        </a>
      ) : null}
      {contact.email ? (
        <a href={`mailto:${contact.email}`} className={icon} aria-label={`${s.write}: ${contact.name}`} title={s.write}>
          <Mail />
        </a>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground"
        aria-label={`${s.copy}: ${contact.name}`}
        title={s.copy}
        onClick={() => copyContact(contact)}
      >
        <Copy />
      </Button>
    </>
  );
}

/** Full-width buttons for the detail sheet footer. */
export function DetailActions({ contact }: { contact: Contact }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {contact.phone ? (
        <a href={telHref(contact.phone)} className={buttonVariants({ size: "lg" })}>
          <Phone />
          {s.call}
        </a>
      ) : (
        <Button size="lg" disabled>
          <Phone />
          {s.call}
        </Button>
      )}
      {contact.email ? (
        <a href={`mailto:${contact.email}`} className={buttonVariants({ variant: "secondary", size: "lg" })}>
          <Mail />
          {s.write}
        </a>
      ) : (
        <Button variant="secondary" size="lg" disabled>
          <Mail />
          {s.write}
        </Button>
      )}
      <Button variant="outline" size="lg" onClick={() => copyContact(contact)}>
        <Copy />
        {s.copy}
      </Button>
    </div>
  );
}
