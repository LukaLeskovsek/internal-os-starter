"use client";

// Label + control + hint/error. The error comes from the surrounding ActionForm.
//
// <Field label="Kilometri" name="km" hint="Ena smer">
//   <Input id="km" name="km" inputMode="decimal" />
// </Field>
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { useFieldError } from "@/components/app/action-form";
import { sl } from "@/lib/i18n/sl";
import { cn } from "@/lib/utils";

export function Field({
  label,
  name,
  hint,
  optional,
  className,
  children,
}: {
  label: ReactNode;
  name?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const error = useFieldError(name);
  return (
    <div className={cn("space-y-2", className)} data-invalid={error ? "" : undefined}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground"> ({sl.common.optional})</span>
        ) : null}
      </Label>
      <div className="[[data-invalid]_&_input]:border-destructive [[data-invalid]_&_textarea]:border-destructive">
        {children}
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
