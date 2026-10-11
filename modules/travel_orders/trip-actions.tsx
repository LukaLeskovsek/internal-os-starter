"use client";

// The buttons on each trip row: "Ponovi" (one click, undoable) and a menu with
// Uredi / Izbriši. Delete is undoable too, so it needs no confirm dialog.
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
import { deleteTrip, repeatTrip, restoreTrip } from "./actions";
import { t } from "./strings";
import { EditTripSheet } from "./trip-sheet";
import type { Trip, TripDefaults } from "./types";

export function TripActions({ trip, defaults }: { trip: Trip; defaults: TripDefaults }) {
  const run = useActionToast();
  const [editing, setEditing] = useState(false);

  // "Razveljavi" receives what the action returned: the copy's id, the deleted row.
  const repeat = () =>
    run(() => repeatTrip(trip.id), { undo: (res) => deleteTrip(res.data!.id) });
  const remove = () =>
    run(() => deleteTrip(trip.id), { undo: (res) => restoreTrip(res.data!) });

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={repeat}
        disabled={run.pending}
        title={t.repeatHint}
        aria-label={t.repeatHint}
        className="h-10 px-3"
      >
        <Repeat2 />
        <span className="max-sm:sr-only">{t.repeat}</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label={t.moreActions} />}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil />
            {sl.common.edit}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={remove}>
            <Trash2 />
            {sl.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditTripSheet trip={trip} defaults={defaults} open={editing} onOpenChange={setEditing} />
    </>
  );
}
