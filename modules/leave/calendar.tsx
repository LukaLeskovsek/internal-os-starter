"use client";

// The team timeline: people are rows, the month's days are columns, an absence is a
// bar across its days. The job: see at a glance who is away at the same time, and
// fix a date with one drag instead of opening a form.
//
//   - mouse / pen: drag a bar to move it (length stays), drag an edge to change it
//   - keyboard: ← / → moves a focused bar by a day, Shift + ← / → moves its end,
//     Enter opens the edit sheet
//   - touch: a tap opens the edit sheet (dragging on a phone is too imprecise)
//   - an empty cell opens "Nova odsotnost" for that person and day
//
// Every change goes through moveAbsence() (server recounts work days) with
// "Razveljavi". While the server works, the bar stays where it was dropped.
import { useEffect, useMemo, useRef, useState } from "react";
import { useActionToast } from "@/hooks/use-action-toast";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EditAbsenceSheet, PresetAbsenceSheet } from "./absence-sheet";
import { moveAbsence } from "./actions";
import { formatRange } from "./lib/dates";
import { addDays, daysBetween, firstWorkDayFrom } from "./lib/workdays";
import { kindLabel, t } from "./strings";
import type { Absence, AbsenceDefaults, AbsencePreset, Kind } from "./types";

/** One column of the month, prepared on the server. */
export type CalendarDay = {
  date: string; // YYYY-MM-DD
  weekday: string; // "pon"
  day: string; // "12"
  off: "weekend" | "holiday" | "company" | null;
  name?: string; // holiday or company day-off name
};

type Mode = "move" | "start" | "end";
type Drag = { id: string; mode: Mode; x: number; colWidth: number; delta: number; moved: boolean };
type Range = { start: string; end: string };

const KIND_BAR: Record<Kind, string> = {
  dopust: "bg-primary text-primary-foreground",
  bolniska: "bg-warning/30 text-foreground ring-1 ring-inset ring-warning/60",
  drugo: "bg-info/20 text-foreground ring-1 ring-inset ring-info/50",
};

export function TeamCalendar({
  days,
  people,
  absences,
  defaults,
  today,
}: {
  days: CalendarDay[];
  people: { id: string; name: string }[];
  absences: Absence[];
  defaults: AbsenceDefaults;
  today: string;
}) {
  const run = useActionToast();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [pending, setPending] = useState<Record<string, Range>>({});
  const [editing, setEditing] = useState<Absence | null>(null);
  const [preset, setPreset] = useState<AbsencePreset | null>(null);
  const justDragged = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const closed = useMemo(() => new Set(defaults.closed), [defaults.closed]);

  const first = days[0].date;
  const last = days[days.length - 1].date;
  const n = days.length;

  // On a narrow screen the grid scrolls sideways: start at today (or, in another
  // month, at the first absence) instead of the 1st, so the useful part is in view.
  const focusDate =
    today >= first && today <= last
      ? today
      : absences.map((a) => (a.start_date < first ? first : a.start_date)).sort()[0];
  useEffect(() => {
    const el = scroller.current;
    if (!el || !focusDate || el.scrollWidth <= el.clientWidth) return;
    const cell = el.querySelector<HTMLElement>(`[data-date="${focusDate}"]`);
    const names = el.querySelector<HTMLElement>("[data-names]");
    if (cell && names) el.scrollLeft = Math.max(0, cell.offsetLeft - names.offsetWidth - 8);
  }, [focusDate]);

  /** Where a bar is drawn right now: dragged preview > waiting for the server > saved. */
  function rangeOf(a: Absence): Range {
    if (drag?.id === a.id) return applyDelta(a, drag.mode, drag.delta);
    return pending[a.id] ?? { start: a.start_date, end: a.end_date };
  }

  function save(a: Absence, next: Range) {
    if (next.start === a.start_date && next.end === a.end_date) return;
    setPending((p) => ({ ...p, [a.id]: next }));
    const clear = () =>
      setPending((p) => {
        const rest = { ...p };
        delete rest[a.id];
        return rest;
      });
    run(
      async () => {
        const res = await moveAbsence(a.id, next.start, next.end);
        clear();
        return res;
      },
      { undo: (res) => moveAbsence(a.id, res.data!.start_date, res.data!.end_date) },
    );
  }

  // ---------------------------------------------------------------- pointer drag

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>, a: Absence) {
    if (e.pointerType === "touch" || e.button !== 0 || run.pending) return;
    const row = e.currentTarget.parentElement!;
    const edge = (e.target as HTMLElement).dataset.edge as "start" | "end" | undefined;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      id: a.id,
      mode: edge ?? "move",
      x: e.clientX,
      colWidth: row.getBoundingClientRect().width / n,
      delta: 0,
      moved: false,
    });
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    const delta = Math.round((e.clientX - drag.x) / drag.colWidth);
    if (delta !== drag.delta) setDrag({ ...drag, delta, moved: true });
  }

  function onPointerUp(a: Absence) {
    if (!drag) return;
    const next = applyDelta(a, drag.mode, drag.delta);
    // A real drag must not also count as a click (which opens the edit sheet).
    justDragged.current = drag.moved;
    setDrag(null);
    save(a, next);
  }

  // ---------------------------------------------------------------- keyboard

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, a: Absence) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    if (run.pending) return;
    const step = e.key === "ArrowLeft" ? -1 : 1;
    save(a, applyDelta({ ...a, ...toAbsenceDates(rangeOf(a)) }, e.shiftKey ? "end" : "move", step));
  }

  function openEdit(a: Absence) {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    setEditing(a);
  }

  return (
    <>
      <div
        ref={scroller}
        role="region"
        aria-label={t.calendarLabel}
        className="overflow-x-auto rounded-2xl bg-card shadow-xs ring-1 ring-foreground/8"
      >
        {/* Fill the width on a laptop; when a day would get narrower than --day the grid
            scrolls sideways instead. Phones keep 2.5rem days, so a cell stays tappable. */}
        <div
          className="grid w-full [--day:2.5rem] md:[--day:1.75rem]"
          style={{
            gridTemplateColumns: `minmax(7.5rem, 11rem) repeat(${n}, minmax(var(--day), 1fr))`,
            minWidth: `calc(7.5rem + ${n} * var(--day))`,
          }}
        >
          {/* Header: weekday + day number; days off shaded, today ringed. */}
          <div data-names className="sticky left-0 z-20 border-b bg-card px-3 py-2 text-sm font-medium text-muted-foreground">
            {t.person}
          </div>
          {days.map((d) => (
            <div
              key={d.date}
              data-date={d.date}
              title={d.name}
              className={cn(
                "flex flex-col items-center justify-center border-b py-1.5 text-center leading-tight",
                d.off === "company" ? "bg-info/10" : d.off ? "bg-muted" : null,
              )}
            >
              <span className="text-[0.65rem] text-muted-foreground uppercase">{d.weekday}</span>
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums",
                  d.date === today && "bg-primary text-primary-foreground",
                  d.off === "holiday" && d.date !== today && "text-destructive",
                )}
              >
                {d.day}
              </span>
            </div>
          ))}

          {people.map((p, i) => {
            const mine = absences.filter((a) => a.person_id === p.id);
            return (
              <div key={p.id} className="contents">
                <div
                  className={cn(
                    "sticky left-0 z-20 flex h-11 items-center truncate bg-card px-3 text-sm font-medium",
                    i > 0 && "border-t",
                  )}
                >
                  <span className="truncate">{p.name}</span>
                </div>
                <div
                  className={cn("relative grid h-11", i > 0 && "border-t")}
                  style={{ gridColumn: `2 / span ${n}`, gridTemplateColumns: `repeat(${n}, minmax(var(--day), 1fr))` }}
                >
                  {/* Empty cells: shading + "Nova odsotnost" for this person and day. */}
                  {days.map((d, col) => (
                    <button
                      key={d.date}
                      type="button"
                      aria-label={t.newHere(p.name, formatDateShort(d.date))}
                      title={d.name}
                      onClick={() => setPreset({ personId: p.id, date: firstWorkDayFrom(d.date, closed) })}
                      style={{ gridColumn: col + 1, gridRow: 1 }}
                      className={cn(
                        "h-full outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent",
                        d.off === "company" ? "bg-info/10" : d.off ? "bg-muted/70" : null,
                      )}
                    />
                  ))}

                  {mine.map((a) => {
                    const r = rangeOf(a);
                    if (r.end < first || r.start > last) return null;
                    const startCol = Math.max(0, daysBetween(first, r.start)) + 1;
                    const endCol = Math.min(n - 1, daysBetween(first, r.end)) + 1;
                    const cutLeft = r.start < first;
                    const cutRight = r.end > last;
                    const label = t.barLabel(p.name, kindLabel[a.kind], formatRange(r.start, r.end));
                    return (
                      <button
                        key={a.id}
                        type="button"
                        aria-label={label}
                        title={`${label}\n${t.dragHint}`}
                        onPointerDown={(e) => onPointerDown(e, a)}
                        onPointerMove={onPointerMove}
                        onPointerUp={() => onPointerUp(a)}
                        onPointerCancel={() => setDrag(null)}
                        onKeyDown={(e) => onKeyDown(e, a)}
                        onClick={() => openEdit(a)}
                        style={{ gridColumn: `${startCol} / ${endCol + 1}`, gridRow: 1 }}
                        className={cn(
                          "group relative z-10 mx-0.5 my-1.5 flex min-w-0 cursor-grab touch-pan-x items-center overflow-hidden px-2 text-left text-xs font-semibold outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/60 active:cursor-grabbing",
                          KIND_BAR[a.kind],
                          cutLeft ? "rounded-l-none" : "rounded-l-lg",
                          cutRight ? "rounded-r-none" : "rounded-r-lg",
                          drag?.id === a.id && "opacity-85 shadow-lg",
                          pending[a.id] && "animate-pulse",
                        )}
                      >
                        {!cutLeft ? <Edge side="start" /> : null}
                        <span className="truncate">{kindLabel[a.kind]}</span>
                        {!cutRight ? <Edge side="end" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-sm text-muted-foreground">
        {(Object.keys(KIND_BAR) as Kind[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-2">
            <span className={cn("h-3 w-5 rounded", KIND_BAR[k])} />
            {kindLabel[k]}
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-muted ring-1 ring-inset ring-foreground/10" />
          {t.legendWeekend}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-info/10 ring-1 ring-inset ring-foreground/10" />
          {t.legendCompany}
        </span>
        <span className="max-md:hidden">{t.dragHint}</span>
      </div>

      {editing ? (
        <EditAbsenceSheet
          absence={editing}
          defaults={defaults}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
      <PresetAbsenceSheet defaults={defaults} preset={preset} onOpenChange={(open) => !open && setPreset(null)} />
    </>
  );
}

/** A grab handle on a bar's end: dragging it changes that end only. */
function Edge({ side }: { side: "start" | "end" }) {
  return (
    <span
      data-edge={side}
      aria-hidden
      className={cn(
        "absolute inset-y-0 w-2 cursor-ew-resize opacity-0 transition-opacity group-hover:opacity-100",
        side === "start" ? "left-0 rounded-l-lg" : "right-0 rounded-r-lg",
        "bg-foreground/15",
      )}
    />
  );
}

/** New dates after dragging by `delta` days. Edges never cross: a range is at least one day. */
function applyDelta(a: Pick<Absence, "start_date" | "end_date">, mode: Mode, delta: number): Range {
  if (mode === "move") return { start: addDays(a.start_date, delta), end: addDays(a.end_date, delta) };
  if (mode === "start") {
    const start = addDays(a.start_date, delta);
    return { start: start > a.end_date ? a.end_date : start, end: a.end_date };
  }
  const end = addDays(a.end_date, delta);
  return { start: a.start_date, end: end < a.start_date ? a.start_date : end };
}

function toAbsenceDates(r: Range): Pick<Absence, "start_date" | "end_date"> {
  return { start_date: r.start, end_date: r.end };
}
