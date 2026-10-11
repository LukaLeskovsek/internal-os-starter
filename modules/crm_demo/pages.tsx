import type { ModuleProps } from "@/lib/modules";
import { CloudOff, ContactRound, UserX } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/app/status-badge";
import { DetailSheet } from "@/components/app/detail-sheet";
import { Info, InfoGrid } from "@/components/app/info";
import { sl } from "@/lib/i18n/sl";
import { listContacts, getContact } from "./lib/intrix";
import type { Contact } from "./lib/mock-data";
import { ContactSearch } from "./contact-search";
import { DetailActions } from "./contact-actions";
import { s } from "./strings";

// The "Iskanje" reference: read-only data from an external API (lib/intrix.ts,
// with a bundled mock), searched client-side, details in a URL-driven sheet.
export async function CrmDemoModule({ searchParams }: ModuleProps) {
  const selectedId = searchParams.id;

  let contacts: Contact[] = [];
  let mock = false;
  let failed = false;
  try {
    ({ contacts, mock } = await listContacts());
  } catch (e) {
    console.error("crm_demo listContacts failed", e);
    failed = true;
  }

  let selected: Contact | null = null;
  if (selectedId) {
    selected = contacts.find((c) => c.id === selectedId) ?? null;
    if (!selected && !failed) {
      try {
        selected = (await getContact(selectedId)).contact;
      } catch (e) {
        console.error("crm_demo getContact failed", e);
      }
    }
  }

  return (
    <div>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {s.title}
            {mock ? <StatusBadge tone="attention">{sl.common.demo}</StatusBadge> : null}
          </span>
        }
        description={s.description}
      />

      {failed ? (
        <EmptyState icon={CloudOff} title={s.loadFailedTitle}>
          {s.loadFailedText}
        </EmptyState>
      ) : contacts.length === 0 ? (
        <EmptyState icon={ContactRound} title={s.emptyTitle}>
          {s.emptyText}
        </EmptyState>
      ) : (
        <ContactSearch contacts={contacts} />
      )}

      {selectedId ? (
        selected ? (
          <DetailSheet
            title={selected.name}
            description={selected.company}
            closeHref="/m/crm_demo"
            footer={<DetailActions contact={selected} />}
          >
            <InfoGrid className="sm:grid-cols-1">
              <Info label={s.phone}>{selected.phone}</Info>
              <Info label={s.email}>{selected.email}</Info>
              <Info label={s.company}>{selected.company}</Info>
            </InfoGrid>
          </DetailSheet>
        ) : (
          <DetailSheet title={s.notFoundTitle} closeHref="/m/crm_demo">
            <EmptyState icon={UserX} title={s.notFoundTitle} className="border-0 bg-transparent">
              {s.notFoundText}
            </EmptyState>
          </DetailSheet>
        )
      ) : null}
    </div>
  );
}
