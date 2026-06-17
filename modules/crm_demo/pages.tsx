import Link from "next/link";
import { listContacts, getContact } from "./lib/intrix";
import { Card } from "@/components/ui/card";

function DemoBadge() {
  return (
    <span className="rounded bg-card px-2 py-0.5 text-xs text-muted">
      demo data
    </span>
  );
}

export async function CrmDemoModule({ selectedId }: { selectedId?: string }) {
  // Detail view
  if (selectedId) {
    const { contact, mock } = await getContact(selectedId);
    return (
      <div className="space-y-4">
        <Link href="/m/crm_demo" className="text-sm text-accent">
          ← Back to contacts
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {contact?.name ?? "Contact not found"}
          </h1>
          {mock ? <DemoBadge /> : null}
        </div>
        {contact ? (
          <Card className="space-y-1 text-sm">
            <div>
              <span className="text-muted">Company: </span>
              {contact.company ?? "—"}
            </div>
            <div>
              <span className="text-muted">Email: </span>
              {contact.email ?? "—"}
            </div>
            <div>
              <span className="text-muted">Phone: </span>
              {contact.phone ?? "—"}
            </div>
          </Card>
        ) : null}
      </div>
    );
  }

  // List view
  const { contacts, mock } = await listContacts();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        {mock ? <DemoBadge /> : null}
      </div>
      <p className="text-sm text-muted">
        Read-only, pulled from Intrix. This module is the reference for{" "}
        <code>/integrate-api</code>.
      </p>
      <div className="space-y-2">
        {contacts.map((c) => (
          <Link key={c.id} href={`/m/crm_demo?id=${encodeURIComponent(c.id)}`}>
            <Card className="flex items-center justify-between transition hover:border-accent">
              <span className="font-medium">{c.name}</span>
              <span className="text-sm text-muted">{c.company}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
