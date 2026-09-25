// Types + pure helpers shared between the server aggregation
// (server/services/calendar/calendar.ts) and the client calendar view.
// Kept out of calendar.ts on purpose: that file imports `prisma`, and a
// client component importing anything from it — even just a value export
// like a helper function — pulls the whole module (and therefore `pg`)
// into the browser bundle.

export type CalendarEventKind = "income" | "expense" | "savings" | "reminder";

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  label: string;
  date: Date;
  amountCents?: number;
  /** Transaction status — undefined for reminders (a reminder is never a
   * transaction, so it never carries PLANNED/COMPLETED/SKIPPED). */
  status?: "PLANNED" | "COMPLETED" | "SKIPPED";
  isSubscription?: boolean;
  isProject?: boolean;
  time?: string;
};

export type CalendarFilters = {
  income?: boolean;
  expense?: boolean;
  savings?: boolean;
  subscriptions?: boolean;
  projects?: boolean;
  reminders?: boolean;
};

/** Signed sum of a day's COMPLETED (never PLANNED/SKIPPED) transaction
 * events — used only for the day-detail panel's "projected balance after
 * these operations" note, itself just a local delta, not a new forecast
 * calculation. */
export function netCompletedCentsForDay(events: CalendarEvent[]): number {
  return events.reduce((sum, e) => {
    if (e.status !== "COMPLETED" || e.amountCents === undefined) return sum;
    return e.kind === "income" ? sum + e.amountCents : sum - e.amountCents;
  }, 0);
}
