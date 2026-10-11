"use client";

// Row buttons: "Ponovi" (one click) and a menu with Uredi / Izbriši.
// Both repeat and delete are undoable, so neither needs a confirm dialog.
import { useState } from "react";
import { MoreHorizontal, Pencil, Repeat2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActionToast } from "@/hooks/use-action-toast";
import { sl } from "@/lib/i18n/sl";
import { deleteItem, repeatItem, restoreItem } from "./actions";
import { EditItemSheet } from "./item-sheet";
import { t } from "./strings";
import type { Item, ItemDefaults } from "./types";

export function ItemRowActions({ item, defaults }: { item: Item; defaults: ItemDefaults }) {
  const run = useActionToast();
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-10 px-3"
        disabled={run.pending}
        aria-label={t.repeatHint}
        title={t.repeatHint}
        onClick={() => run(() => repeatItem(item.id), { undo: (res) => deleteItem(res.data!.id) })}
      >
        <Repeat2 />
        <span className="max-sm:sr-only">{t.repeat}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t.moreActions} />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil />
            {sl.common.edit}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => run(() => deleteItem(item.id), { undo: (res) => restoreItem(res.data!) })}
          >
            <Trash2 />
            {sl.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditItemSheet item={item} defaults={defaults} open={editing} onOpenChange={setEditing} />
    </>
  );
}
