"use client";

// Row menus: Uredi / Izbriši. Delete is undoable, so neither needs a confirm dialog.
import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActionToast } from "@/hooks/use-action-toast";
import { sl } from "@/lib/i18n/sl";
import {
  deleteAbsence,
  deleteCompanyDay,
  deletePerson,
  restoreAbsence,
  restoreCompanyDay,
  restorePerson,
} from "./actions";
import { EditAbsenceSheet } from "./absence-sheet";
import { EditPersonSheet } from "./person-sheet";
import { t } from "./strings";
import type { Absence, AbsenceDefaults, CompanyDay, Person } from "./types";

export function AbsenceActions({ absence, defaults }: { absence: Absence; defaults: AbsenceDefaults }) {
  const run = useActionToast();
  const [editing, setEditing] = useState(false);
  const remove = () =>
    run(() => deleteAbsence(absence.id), { undo: (res) => restoreAbsence(res.data!) });

  return (
    <>
      <RowMenu onEdit={() => setEditing(true)} onDelete={remove} disabled={run.pending} />
      <EditAbsenceSheet absence={absence} defaults={defaults} open={editing} onOpenChange={setEditing} />
    </>
  );
}

export function PersonActions({ person }: { person: Person }) {
  const run = useActionToast();
  const [editing, setEditing] = useState(false);
  const remove = () =>
    run(() => deletePerson(person.id), { undo: (res) => restorePerson(res.data!) });

  return (
    <>
      <RowMenu onEdit={() => setEditing(true)} onDelete={remove} disabled={run.pending} />
      <EditPersonSheet person={person} open={editing} onOpenChange={setEditing} />
    </>
  );
}

/** A company day off has nothing to edit worth a sheet: delete (undoable) is the only action. */
export function CompanyDayActions({ day }: { day: CompanyDay }) {
  const run = useActionToast();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-10"
      aria-label={sl.common.delete}
      title={sl.common.delete}
      disabled={run.pending}
      onClick={() => run(() => deleteCompanyDay(day.id), { undo: (res) => restoreCompanyDay(res.data!) })}
    >
      <Trash2 />
    </Button>
  );
}

function RowMenu({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="size-10" aria-label={t.moreActions} disabled={disabled} />}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          {sl.common.edit}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          {sl.common.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
