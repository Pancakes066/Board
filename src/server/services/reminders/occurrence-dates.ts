import { daysInMonth } from "@/lib/utils/date";

export type ReminderForOccurrences = {
  date: Date;
  hour: number;
  minute: number;
  frequency: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
  dayOfMonth: number | null;
  month: number | null;
  dayOfWeek: number | null;
  intervalDays: number | null;
  endDate: Date | null;
};

function withTime(date: Date, hour: number, minute: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute));
}

function isWithinRange(date: Date, reminder: Pick<ReminderForOccurrences, "date" | "endDate">): boolean {
  if (date < reminder.date) return false;
  if (reminder.endDate && date > reminder.endDate) return false;
  return true;
}

/**
 * Every occurrence of `reminder` that falls within [from, to] (inclusive),
 * as UTC Date objects carrying the reminder's own hour/minute. Pure
 * function of (reminder, range) — mirrors
 * src/server/services/recurrence/occurrence-dates.ts's algorithm (clamped
 * day-of-month, day-of-week) but computed live over an arbitrary window
 * instead of one calendar month at a time, since reminders have no
 * materialized occurrence table to backfill into.
 */
export function computeReminderOccurrenceDates(
  reminder: ReminderForOccurrences,
  range: { from: Date; to: Date },
): Date[] {
  const { from, to } = range;
  const results: Date[] = [];

  switch (reminder.frequency) {
    case "ONCE": {
      const occurrence = withTime(reminder.date, reminder.hour, reminder.minute);
      if (occurrence >= from && occurrence <= to) results.push(occurrence);
      return results;
    }

    case "DAILY": {
      const cursor = new Date(
        Date.UTC(reminder.date.getUTCFullYear(), reminder.date.getUTCMonth(), reminder.date.getUTCDate()),
      );
      const windowEnd = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
      // Cap iterations defensively — a reminder with no endDate must never
      // spin unbounded even if `range` is accidentally huge.
      let guard = 0;
      while (cursor <= windowEnd && guard < 3660) {
        guard += 1;
        if (isWithinRange(cursor, reminder)) {
          const occurrence = withTime(cursor, reminder.hour, reminder.minute);
          if (occurrence >= from && occurrence <= to) results.push(occurrence);
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      return results;
    }

    case "CUSTOM": {
      if (!reminder.intervalDays || reminder.intervalDays < 1) return [];
      const cursor = new Date(
        Date.UTC(reminder.date.getUTCFullYear(), reminder.date.getUTCMonth(), reminder.date.getUTCDate()),
      );
      const windowEnd = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
      let guard = 0;
      while (cursor <= windowEnd && guard < 3660) {
        guard += 1;
        if (isWithinRange(cursor, reminder)) {
          const occurrence = withTime(cursor, reminder.hour, reminder.minute);
          if (occurrence >= from && occurrence <= to) results.push(occurrence);
        }
        cursor.setUTCDate(cursor.getUTCDate() + reminder.intervalDays);
      }
      return results;
    }

    case "WEEKLY": {
      if (reminder.dayOfWeek === null || reminder.dayOfWeek === undefined) return [];
      const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
      const windowEnd = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
      let guard = 0;
      while (cursor <= windowEnd && guard < 3660) {
        guard += 1;
        if (cursor.getUTCDay() === reminder.dayOfWeek && isWithinRange(cursor, reminder)) {
          const occurrence = withTime(cursor, reminder.hour, reminder.minute);
          if (occurrence >= from && occurrence <= to) results.push(occurrence);
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      return results;
    }

    case "MONTHLY": {
      if (!reminder.dayOfMonth) return [];
      const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
      const windowEnd = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
      let guard = 0;
      while (cursor <= windowEnd && guard < 240) {
        guard += 1;
        const year = cursor.getUTCFullYear();
        const month = cursor.getUTCMonth() + 1;
        // End-of-month clamp — e.g. "the 31st" on a 30-day month lands on
        // the 30th, matching computeOccurrenceDates' own rule.
        const day = Math.min(reminder.dayOfMonth, daysInMonth(year, month));
        const date = new Date(Date.UTC(year, month - 1, day));
        if (isWithinRange(date, reminder)) {
          const occurrence = withTime(date, reminder.hour, reminder.minute);
          if (occurrence >= from && occurrence <= to) results.push(occurrence);
        }
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
      return results;
    }

    case "YEARLY": {
      if (!reminder.dayOfMonth || !reminder.month) return [];
      const startYear = from.getUTCFullYear();
      const endYear = to.getUTCFullYear();
      for (let year = startYear; year <= endYear; year += 1) {
        const day = Math.min(reminder.dayOfMonth, daysInMonth(year, reminder.month));
        const date = new Date(Date.UTC(year, reminder.month - 1, day));
        if (isWithinRange(date, reminder)) {
          const occurrence = withTime(date, reminder.hour, reminder.minute);
          if (occurrence >= from && occurrence <= to) results.push(occurrence);
        }
      }
      return results;
    }

    default:
      return results;
  }
}
