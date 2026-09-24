import type { RecurringRule } from "@prisma/client";
import { daysInMonth, type Period } from "@/lib/utils/date";

function isWithinRange(date: Date, rule: Pick<RecurringRule, "startDate" | "endDate">): boolean {
  if (date < rule.startDate) return false;
  if (rule.endDate && date > rule.endDate) return false;
  return true;
}

/**
 * Every date in `period` this rule fires on, clamped to its [startDate,
 * endDate] range. Pure function of (rule, period) — same inputs always
 * produce the same dates, which is what makes generateOccurrencesForPeriod
 * safe to re-run.
 */
export function computeOccurrenceDates(
  rule: Pick<
    RecurringRule,
    "frequency" | "dayOfMonth" | "month" | "dayOfWeek" | "startDate" | "endDate"
  >,
  { year, month }: Period,
): Date[] {
  switch (rule.frequency) {
    case "MONTHLY": {
      if (!rule.dayOfMonth) return [];
      const day = Math.min(rule.dayOfMonth, daysInMonth(year, month));
      const date = new Date(Date.UTC(year, month - 1, day));
      return isWithinRange(date, rule) ? [date] : [];
    }

    case "YEARLY": {
      if (!rule.dayOfMonth || !rule.month || rule.month !== month) return [];
      const day = Math.min(rule.dayOfMonth, daysInMonth(year, month));
      const date = new Date(Date.UTC(year, month - 1, day));
      return isWithinRange(date, rule) ? [date] : [];
    }

    case "WEEKLY": {
      if (rule.dayOfWeek === null || rule.dayOfWeek === undefined) return [];
      const dates: Date[] = [];
      const total = daysInMonth(year, month);
      for (let day = 1; day <= total; day += 1) {
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCDay() === rule.dayOfWeek && isWithinRange(date, rule)) {
          dates.push(date);
        }
      }
      return dates;
    }

    default:
      return [];
  }
}
