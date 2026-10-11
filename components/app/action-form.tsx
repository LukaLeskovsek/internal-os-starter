"use client";

// A form that calls a Server Action returning ActionResult and turns the result
// into a toast + field errors. Inputs keep their values on error; on success the
// form resets (or you react in onSuccess, e.g. close a sheet).
//
// <ActionForm action={saveTrip} onSuccess={() => setOpen(false)}>
//   <Field label="Kilometri" name="km"><Input id="km" name="km" /></Field>
//   <SubmitButton>Shrani</SubmitButton>
// </ActionForm>
import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useRef,
  startTransition,
} from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";
import { sl } from "@/lib/i18n/sl";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormAction<T = any> = (
  prev: ActionResult<T>,
  formData: FormData,
) => Promise<ActionResult<T>>;

const FieldErrors = createContext<Record<string, string>>({});
/** True while the surrounding ActionForm's action runs (SubmitButton reads it). */
export const FormPending = createContext(false);
export const useFieldError = (name?: string) => {
  const errors = useContext(FieldErrors);
  return name ? errors[name] : undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ActionForm<T = any>({
  action,
  onSuccess,
  resetOnSuccess = true,
  silent = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"form">, "action" | "onSubmit"> & {
  action: FormAction<T>;
  onSuccess?: (result: Extract<ActionResult<T>, { ok: true }>) => void;
  resetOnSuccess?: boolean;
  /** No success toast (e.g. the UI change itself is the feedback). */
  silent?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult<T> | null,
    FormData
  >((prev, fd) => action((prev ?? { ok: true }) as ActionResult<T>, fd), null);
  const formRef = useRef<HTMLFormElement>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (!silent) toast.success(state.message ?? sl.common.saved);
      if (resetOnSuccess) formRef.current?.reset();
      onSuccessRef.current?.(state as Extract<ActionResult<T>, { ok: true }>);
    } else {
      toast.error(state.error);
    }
  }, [state, silent, resetOnSuccess]);

  return (
    <FormPending.Provider value={pending}>
      <FieldErrors.Provider
        value={state && !state.ok ? (state.fieldErrors ?? {}) : {}}
      >
        <form
          ref={formRef}
          // Our zod messages (Slovenian, under the field) replace the browser's own bubbles.
          noValidate
          className={cn("space-y-5", className)}
          // onSubmit (not action=) so React doesn't wipe the inputs on a validation error.
          onSubmit={(e) => {
            e.preventDefault();
            // Pass the clicked button so <button name="decision" value="…"> works.
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const fd = new FormData(e.currentTarget, submitter);
            startTransition(() => formAction(fd));
          }}
          {...props}
        >
          {children}
        </form>
      </FieldErrors.Provider>
    </FormPending.Provider>
  );
}
