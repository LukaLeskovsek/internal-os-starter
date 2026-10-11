"use client";

// "Dodaj osebo": email, name, a generated temporary password and the tools they
// may use, all in one step. On success the toast offers to copy the sign-in
// details so the owner can paste them into a chat or email.
//
// Built from Sheet + ActionForm directly (not FormSheet) because the success
// toast needs its own action button.
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Copy, RefreshCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/ui/submit-button";
import { ActionForm } from "@/components/app/action-form";
import { Field } from "@/components/app/field";
import { KbdHint } from "@/components/app/kbd-hint";
import { useHotkey } from "@/hooks/use-hotkey";
import { sl } from "@/lib/i18n/sl";
import { addUser } from "./actions";
import { s } from "./strings";

export type GrantableModule = { id: string; label: string; icon: React.ReactNode };

// Readable but not guessable: "Bovira-Kelupa-47" (~44 bits). No 0/O, 1/l/I.
const CONSONANTS = "bcdfghjkmnprstvz";
const VOWELS = "aeiou";
function generatePassword(): string {
  const r = new Uint32Array(14);
  crypto.getRandomValues(r);
  let i = 0;
  const pick = (set: string) => set[r[i++] % set.length];
  const word = () => {
    let w = "";
    for (let k = 0; k < 3; k++) w += pick(CONSONANTS) + pick(VOWELS);
    return w[0].toUpperCase() + w.slice(1);
  };
  const digits = String(r[i++] % 90 + 10);
  return `${word()}-${word()}-${digits}`;
}

export function AddPersonSheet({
  modules,
  defaultOpen,
}: {
  modules: GrantableModule[];
  defaultOpen: boolean;
}) {
  const [open, setOpenState] = useState(defaultOpen);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setOpen = (next: boolean) => {
    setOpenState(next);
    // Closing a deep-linked sheet drops ?nov=1 so a refresh doesn't reopen it.
    if (!next && params.get("nov")) {
      const qs = new URLSearchParams(params.toString());
      qs.delete("nov");
      router.replace(qs.size ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  };

  useHotkey("n", () => setOpen(true), { enabled: !open });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="lg">
            <UserPlus />
            {s.addPerson}
            <KbdHint>N</KbdHint>
          </Button>
        }
      />
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{s.addPersonTitle}</SheetTitle>
          <SheetDescription>{s.addPersonDescription}</SheetDescription>
        </SheetHeader>
        {/* Mounted only while open, so every opening starts with a fresh password. */}
        <AddPersonForm modules={modules} onDone={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function AddPersonForm({ modules, onDone }: { modules: GrantableModule[]; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [granted, setGranted] = useState<Set<string>>(new Set());

  // Generated on the client after mount: no hydration mismatch, never sent by us.
  useEffect(() => setPassword(generatePassword()), []);

  const toggle = (id: string, on: boolean) =>
    setGranted((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const copy = async (text: string, message: string = sl.common.copied) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error(sl.errors.generic);
    }
  };

  return (
    <ActionForm
      action={addUser}
      silent
      resetOnSuccess={false}
      className="flex flex-1 flex-col px-5 pb-5"
      onSuccess={(res) => {
        const email = res.data?.email ?? "";
        const credentials = s.credentials(email, password, `${window.location.origin}/login`);
        toast.success(res.message ?? sl.common.saved, {
          duration: 20_000,
          action: { label: s.copyCredentials, onClick: () => void copy(credentials) },
        });
        onDone();
      }}
    >
      <div className="space-y-5">
        <Field label={s.email} name="email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="off"
            inputMode="email"
            placeholder={s.emailPlaceholder}
          />
        </Field>
        <Field label={s.fullName} name="full_name" optional>
          <Input id="full_name" name="full_name" autoComplete="off" maxLength={120} placeholder={s.fullNamePlaceholder} />
        </Field>
        <Field label={s.password} name="password" hint={s.passwordHint}>
          <div className="flex gap-2">
            <Input
              id="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              spellCheck={false}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono tracking-wide"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={s.copyPassword}
              title={s.copyPassword}
              onClick={() => copy(password)}
            >
              <Copy />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={s.regenerate}
              title={s.regenerate}
              onClick={() => setPassword(generatePassword())}
            >
              <RefreshCw />
            </Button>
          </div>
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{s.grantModules}</legend>
          {modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">{s.noModules}</p>
          ) : (
            <div className="divide-y overflow-hidden rounded-2xl ring-1 ring-foreground/8">
              {modules.map((m) => (
                <label
                  key={m.id}
                  className="flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-accent/50"
                >
                  {m.icon}
                  <span className="flex-1 font-medium">{m.label}</span>
                  <Checkbox checked={granted.has(m.id)} onCheckedChange={(on) => toggle(m.id, on)} />
                </label>
              ))}
            </div>
          )}
          {[...granted].map((id) => (
            <input key={id} type="hidden" name="modules" value={id} />
          ))}
          <p className="text-sm text-muted-foreground">{s.grantModulesHint}</p>
        </fieldset>
      </div>
      <div className="mt-auto flex gap-2 pt-6">
        <SubmitButton size="lg" className="flex-1" pendingText={s.adding}>
          {s.addSubmit}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
