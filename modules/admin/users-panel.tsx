"use client";

// Uporabniki: one row per person with role + status, and a row menu for role,
// enable/disable and delete. Changes show instantly (useOptimistic) and the
// reversible ones offer "Razveljavi".
import { useOptimistic, useState } from "react";
import { MoreHorizontal, ShieldCheck, Trash2, UserCheck, UserMinus, UserX } from "lucide-react";
import { DataList, ListRow } from "@/components/app/data-list";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActionToast } from "@/hooks/use-action-toast";
import type { Profile } from "@/lib/access";
import { cn } from "@/lib/utils";
import { setRole, setUserDisabled } from "./actions";
import { ConfirmDeleteUser } from "./confirm-delete-user";
import { displayName, initials } from "./people";
import { s } from "./strings";

type Patch = { id: string } & Partial<Pick<Profile, "role" | "disabled">>;

export function UsersPanel({ users, selfId }: { users: Profile[]; selfId: string }) {
  const [list, patch] = useOptimistic<Profile[], Patch>(users, (state, p) =>
    state.map((u) => (u.id === p.id ? { ...u, ...p } : u)),
  );
  return (
    <DataList>
      {list.map((u) => (
        <UserRow key={u.id} user={u} isSelf={u.id === selfId} patch={patch} />
      ))}
    </DataList>
  );
}

function UserRow({
  user: u,
  isSelf,
  patch,
}: {
  user: Profile;
  isSelf: boolean;
  patch: (p: Patch) => void;
}) {
  const run = useActionToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const name = displayName(u);

  const changeRole = () => {
    const next = u.role === "owner" ? "member" : "owner";
    run(
      async () => {
        patch({ id: u.id, role: next });
        return setRole(u.id, next);
      },
      { undo: () => setRole(u.id, u.role) },
    );
  };
  const toggleDisabled = () => {
    const next = !u.disabled;
    run(
      async () => {
        patch({ id: u.id, disabled: next });
        return setUserDisabled(u.id, next);
      },
      { undo: () => setUserDisabled(u.id, !next) },
    );
  };

  // Hide at once after a confirmed delete; the refreshed list drops it for good.
  if (deleted) return null;

  return (
    <ListRow
      className={cn(u.disabled && "opacity-70")}
      leading={
        <span
          aria-hidden
          className="grid size-10 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
        >
          {initials(u)}
        </span>
      }
      title={
        <>
          {name}
          {isSelf ? <span className="font-normal text-muted-foreground"> ({s.you})</span> : null}
        </>
      }
      meta={u.full_name ? u.email : null}
      trailing={
        <div className="flex flex-wrap justify-end gap-1.5">
          {u.role === "owner" ? (
            <StatusBadge tone="info">
              <ShieldCheck className="size-3.5" />
              {s.owner}
            </StatusBadge>
          ) : (
            <StatusBadge className="max-sm:hidden">{s.member}</StatusBadge>
          )}
          {u.disabled ? <StatusBadge tone="danger">{s.disabled}</StatusBadge> : null}
        </div>
      }
      actions={
        isSelf ? (
          <span className="size-10" aria-hidden />
        ) : (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label={s.rowMenu(name)} disabled={run.pending}>
                    <MoreHorizontal />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-auto min-w-48">
                <DropdownMenuItem onClick={changeRole}>
                  {u.role === "owner" ? <UserMinus /> : <ShieldCheck />}
                  {u.role === "owner" ? s.makeMember : s.makeOwner}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleDisabled}>
                  {u.disabled ? <UserCheck /> : <UserX />}
                  {u.disabled ? s.enable : s.disable}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                  <Trash2 />
                  {s.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmDeleteUser
              userId={u.id}
              label={name}
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              onDeleted={() => setDeleted(true)}
            />
          </>
        )
      }
    />
  );
}
