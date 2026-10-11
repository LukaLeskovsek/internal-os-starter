"use client";

// The three admin tabs, kept in the URL (?tab=) so a refresh or a link lands
// on the same one. Switching uses history.replaceState: instant, no refetch.
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseTab, type AdminTab } from "./tabs";

export function AdminTabs({
  tab,
  labels,
  panels,
}: {
  tab: AdminTab;
  labels: Record<AdminTab, ReactNode>;
  panels: Record<AdminTab, ReactNode>;
}) {
  const params = useSearchParams();
  const current = params.has("tab") ? parseTab(params.get("tab")) : tab;
  const tabs = Object.keys(labels) as AdminTab[];

  return (
    <Tabs
      value={current}
      onValueChange={(value) => {
        const qs = new URLSearchParams(params.toString());
        qs.set("tab", String(value));
        qs.delete("nov");
        window.history.replaceState(null, "", `?${qs}`);
      }}
      className="gap-6"
    >
      <TabsList className="h-11! w-full p-1 sm:w-fit">
        {tabs.map((t) => (
          <TabsTrigger key={t} value={t} className="px-4">
            {labels[t]}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t} value={t} className="text-base">
          {panels[t]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
