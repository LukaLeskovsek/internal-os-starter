// The module page (server component). Job first: say in one comment who uses this,
// when, and what "done" looks like for them — then build exactly that.
//
// Job: "<kdo>, <kdaj>, <kaj želi doseči>."
//
// Shape of the quick-entry pattern: header with the job + the ONE primary action,
// a list of the person's recent entries with "Ponovi" on every row, a friendly
// empty state. Data loads here; sheets and row buttons are small client components.
import Link from "next/link";
import { NotebookPen, Plus } from "lucide-react";
import type { ModuleProps } from "@/lib/modules";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { DataList, ListRow } from "@/components/app/data-list";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { formatRelative, todayIso } from "@/lib/format";
import { NewItemSheet } from "./item-sheet";
import { ItemRowActions } from "./item-row";
import { t } from "./strings";
import type { Item, ItemDefaults } from "./types";

const BASE = "/m/template";

export async function TemplateModule({ searchParams }: ModuleProps) {
  // RLS scopes this to the signed-in person's own rows.
  const supabase = await createClient();
  const { data } = await supabase
    .from("template_items")
    .select("id, title, note, item_date, created_at")
    .order("item_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);
  const items = (data ?? []) as Item[];

  // Guesses for the sheet, from the person's own history.
  const recentTitles = [...new Set(items.map((i) => i.title))].slice(0, 5);
  const defaults: ItemDefaults = { today: todayIso(), yesterday: todayIso(-1), recentTitles };

  return (
    <div className="max-sm:pb-24">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={<NewItemSheet defaults={defaults} defaultOpen={searchParams.nov === "1"} />}
      />

      {items.length ? (
        <DataList>
          {items.map((item) => (
            <ListRow
              key={item.id}
              title={item.title}
              meta={[formatRelative(item.item_date), item.note].filter(Boolean).join(" · ")}
              actions={<ItemRowActions item={item} defaults={defaults} />}
            />
          ))}
        </DataList>
      ) : (
        <EmptyState
          icon={NotebookPen}
          title={t.empty}
          action={
            <Button size="lg" render={<Link href={`${BASE}?nov=1`} scroll={false} />}>
              <Plus />
              {t.newItem}
            </Button>
          }
        >
          {t.emptyText}
        </EmptyState>
      )}
    </div>
  );
}
