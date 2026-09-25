import { prisma } from "@/server/db/prisma";
import { computeReminderOccurrenceDates } from "@/server/services/reminders/occurrence-dates";
import type { CalendarEvent, CalendarEventKind, CalendarFilters } from "@/lib/calendar-events";

export type { CalendarEvent, CalendarEventKind, CalendarFilters } from "@/lib/calendar-events";

const DEFAULT_FILTERS: Required<CalendarFilters> = {
  income: true,
  expense: true,
  savings: true,
  subscriptions: true,
  projects: true,
  reminders: true,
};

/**
 * A pure read-time aggregation — no CalendarEvent table, no duplicated
 * data. Transactions (already the source of truth for income/expense/
 * savings, including subscriptions via isSubscription and project
 * expenses via projectExpenseId) are queried directly; reminders are
 * turned into events via the same occurrence algorithm reminders/ itself
 * uses. Subscriptions and project expenses are NOT a separate kind here —
 * they're EXPENSE transactions with an extra flag, exactly as they exist
 * everywhere else in the app.
 */
export async function getCalendarEvents(
  userId: string,
  range: { from: Date; to: Date },
  filters: CalendarFilters = {},
): Promise<CalendarEvent[]> {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const events: CalendarEvent[] = [];

  const wantsTransactions = f.income || f.expense || f.savings;
  if (wantsTransactions) {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: range.from, lte: range.to },
      },
      include: { recurringRule: { select: { name: true, isSubscription: true } }, category: true },
    });

    for (const t of transactions) {
      const isSubscription = t.recurringRule?.isSubscription ?? false;
      const isProject = t.projectExpenseId !== null;

      if (t.type === "INCOME" && !f.income) continue;
      if (t.type === "EXPENSE" && !f.expense) continue;
      if (t.type === "SAVINGS" && !f.savings) continue;
      if (isSubscription && !f.subscriptions) continue;
      if (isProject && !f.projects) continue;

      const kind: CalendarEventKind =
        t.type === "INCOME" ? "income" : t.type === "SAVINGS" ? "savings" : "expense";

      events.push({
        id: t.id,
        kind,
        label: t.recurringRule?.name ?? t.notes ?? t.category.name,
        date: t.date,
        amountCents: t.amountCents,
        status: t.status,
        isSubscription,
        isProject,
      });
    }
  }

  if (f.reminders) {
    const reminders = await prisma.reminder.findMany({ where: { userId, status: "ACTIVE" } });
    for (const reminder of reminders) {
      const occurrences = computeReminderOccurrenceDates(reminder, range);
      for (const occurrence of occurrences) {
        events.push({
          id: `${reminder.id}:${occurrence.toISOString()}`,
          kind: "reminder",
          label: reminder.title,
          date: occurrence,
          time: `${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`,
        });
      }
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}
