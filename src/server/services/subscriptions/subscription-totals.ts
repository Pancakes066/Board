import { prisma } from "@/server/db/prisma";
import { periodOf, nextPeriod } from "@/lib/utils/date";
import { computeOccurrenceDates } from "@/server/services/recurrence/occurrence-dates";
import type { RecurringRule, Category, RecurrenceFrequency } from "@prisma/client";

export type SubscriptionRow = {
  id: string;
  name: string;
  amountCents: number;
  frequency: RecurrenceFrequency;
  categoryName: string;
  categoryEmoji: string | null;
  nextDueDate: Date | null;
  monthlyCostCents: number;
  annualCostCents: number;
};

/** Normalizes any frequency to a monthly-equivalent cost (52 weeks/year,
 * so weekly * 52/12) so subscriptions on different cadences can be summed
 * and compared on one basis. */
function monthlyEquivalentCents(amountCents: number, frequency: RecurrenceFrequency): number {
  switch (frequency) {
    case "WEEKLY":
      return Math.round((amountCents * 52) / 12);
    case "YEARLY":
      return Math.round(amountCents / 12);
    case "MONTHLY":
    default:
      return amountCents;
  }
}

/** Scans forward period by period (reusing the same date computation the
 * generation engine uses) to find this rule's next occurrence on or after
 * `now` — up to 14 months out, comfortably more than any frequency here
 * needs (a YEARLY rule needs at most 12). */
function getNextDueDate(
  rule: Pick<RecurringRule, "frequency" | "dayOfMonth" | "month" | "dayOfWeek" | "startDate" | "endDate">,
  now: Date,
): Date | null {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let period = periodOf(now);

  for (let i = 0; i < 14; i += 1) {
    const dates = computeOccurrenceDates(rule, period);
    const upcoming = dates.filter((d) => d >= today).sort((a, b) => a.getTime() - b.getTime());
    if (upcoming.length > 0) return upcoming[0];
    period = nextPeriod(period);
  }
  return null;
}

export async function listSubscriptions(userId: string, now: Date): Promise<SubscriptionRow[]> {
  const rules = await prisma.recurringRule.findMany({
    where: {
      userId,
      isSubscription: true,
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    include: { category: true },
    orderBy: { amountCents: "desc" },
  });

  return rules.map((rule: RecurringRule & { category: Category }) => {
    const monthlyCostCents = monthlyEquivalentCents(rule.amountCents, rule.frequency);
    return {
      id: rule.id,
      name: rule.name,
      amountCents: rule.amountCents,
      frequency: rule.frequency,
      categoryName: rule.category.name,
      categoryEmoji: rule.category.emoji,
      nextDueDate: getNextDueDate(rule, now),
      monthlyCostCents,
      annualCostCents: monthlyCostCents * 12,
    };
  });
}

export type SubscriptionTotals = { monthlyCents: number; annualCents: number };

export function sumSubscriptionTotals(rows: SubscriptionRow[]): SubscriptionTotals {
  return rows.reduce(
    (acc, row) => ({
      monthlyCents: acc.monthlyCents + row.monthlyCostCents,
      annualCents: acc.annualCents + row.annualCostCents,
    }),
    { monthlyCents: 0, annualCents: 0 },
  );
}
