import { prisma } from "@/server/db/prisma";
import type { Period } from "@/lib/utils/date";
import { computeOccurrenceDates } from "./occurrence-dates";

/**
 * Creates every occurrence this user's recurring rules produce for
 * `period` that doesn't already exist. Idempotent: the upsert's `update: {}`
 * is a deliberate no-op, so re-running this for a period that's already
 * fully generated touches nothing — never creates a duplicate, never
 * overwrites a completed or per-occurrence-edited row (those aren't even
 * addressed by this upsert's key once they exist, since sourceDate never
 * changes on edit — see Transaction's sourceDate/date split).
 */
export async function generateOccurrencesForPeriod(userId: string, period: Period): Promise<void> {
  const rules = await prisma.recurringRule.findMany({ where: { userId } });

  const writes = rules.flatMap((rule) =>
    computeOccurrenceDates(rule, period).map((sourceDate) =>
      prisma.transaction.upsert({
        where: { recurringRuleId_sourceDate: { recurringRuleId: rule.id, sourceDate } },
        update: {},
        create: {
          userId: rule.userId,
          recurringRuleId: rule.id,
          type: rule.type,
          status: "PLANNED",
          amountCents: rule.amountCents,
          categoryId: rule.categoryId,
          savingsGoalId: rule.savingsGoalId,
          sourceDate,
          date: sourceDate,
          periodYear: period.year,
          periodMonth: period.month,
          isModified: false,
        },
      }),
    ),
  );

  if (writes.length > 0) {
    await prisma.$transaction(writes);
  }
}
