"use client";

// "Za pregled (n)" / "Obdelano". Both panels are rendered on the server; switching
// only rewrites ?tab= in place (no round trip), so the tab survives a refresh and a
// shared link opens on the right one.
import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "../strings";

export type QueueTab = "pregled" | "obdelano";

export function QueueTabs({
  defaultTab,
  queueCount,
  queue,
  done,
}: {
  defaultTab: QueueTab;
  queueCount: number;
  queue: ReactNode;
  done: ReactNode;
}) {
  return (
    <Tabs
      defaultValue={defaultTab}
      onValueChange={(value) => {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", String(value));
        window.history.replaceState(null, "", url);
      }}
      className="gap-5"
    >
      <TabsList className="group-data-horizontal/tabs:h-11 rounded-xl p-1">
        <TabsTrigger value="pregled" className="rounded-lg px-4">
          {t.tabs.queue}
          <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground in-data-active:bg-primary in-data-active:text-primary-foreground">
            {queueCount}
          </span>
        </TabsTrigger>
        <TabsTrigger value="obdelano" className="rounded-lg px-4">
          {t.tabs.done}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="pregled" className="text-[0.9375rem]">{queue}</TabsContent>
      <TabsContent value="obdelano" className="text-[0.9375rem]">{done}</TabsContent>
    </Tabs>
  );
}
