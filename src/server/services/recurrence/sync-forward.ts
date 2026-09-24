import { prisma } from "@/server/db/prisma";
import { nextPeriod, periodOf, type Period } from "@/lib/utils/date";
import { generateOccurrencesForPeriod } from "./generate-month";

/**
 * Call this any time a RecurringRule's shape changes (edit, stop,
 * reactivate) so its generated occurrences catch up. Deletes this rule's
 * future, untouched, still-planned occurrences and regenerates them from
 * the rule's current fields — deliberately simple (delete + regenerate,
 * not a field-by-field patch) because it's trivially correct even when
 * dayOfMonth/frequency itself changed, and nothing of value is ever at
 * risk: the delete filter excludes COMPLETED rows (real history),
 * isModified rows (a user's per-occurrence override), and SKIPPED rows (an
 * explicit "not this one" the user already made) — only regenerable,
 * untouched PLANNED rows are ever removed here.
 */
export async function onRecurringRuleUpdated(
  userId: string,
  ruleId: string,
  now: Date,
): Promise<void> {
  const from = periodOf(now);

  await prisma.transaction.deleteMany({
    where: {
      userId,
      recurringRuleId: ruleId,
      status: "PLANNED",
      isModified: false,
      OR: [
        { periodYear: { gt: from.year } },
        { periodYear: from.year, periodMonth: { gte: from.month } },
      ],
    },
  });

  const upcoming = nextPeriod(from);
  await generateOccurrencesForPeriod(userId, from);
  await generateOccurrencesForPeriod(userId, upcoming);
}

/** The two-month rolling window every "generate on visit/action" trigger uses. */
export async function generateRollingWindow(userId: string, now: Date): Promise<void> {
  const current = periodOf(now);
  await generateOccurrencesForPeriod(userId, current);
  await generateOccurrencesForPeriod(userId, nextPeriod(current));
}

export type { Period };
