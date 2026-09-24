import { prisma } from "@/server/db/prisma";
import type { Period } from "@/lib/utils/date";
import type { FlowType, OccurrenceStatus, Prisma } from "@prisma/client";

export type MonthAggregates = {
  forecastedIncome: number;
  forecastedFixedExpenses: number;
  forecastedSavings: number;
  actualIncome: number;
  actualFixedExpenses: number;
  actualVariableExpenses: number;
  actualSavings: number;
  /** ActualFixedExpenses + ActualVariableExpenses. */
  alreadySpent: number;
  /** ForecastedFixedExpenses - ActualFixedExpenses: planned, not yet paid. */
  reservedExpenses: number;
  /** ForecastedSavings - ActualSavings: planned, not yet set aside. */
  reservedSavings: number;
};

async function sumAmount(where: Prisma.TransactionWhereInput): Promise<number> {
  const result = await prisma.transaction.aggregate({ where, _sum: { amountCents: true } });
  return result._sum.amountCents ?? 0;
}

const FORECASTED_STATUSES: OccurrenceStatus[] = ["PLANNED", "COMPLETED"];

function periodWhere(userId: string, period: Period, type: FlowType) {
  return { userId, periodYear: period.year, periodMonth: period.month, type };
}

/**
 * The month's core numbers, straight from the plan's formulas. Everything
 * here is computed live from the ledger at read time — nothing is cached
 * or stored, so there's no staleness to chase (see the plan's forecast
 * section for the full formula writeup).
 */
export async function getMonthAggregates(userId: string, period: Period): Promise<MonthAggregates> {
  const [
    forecastedIncome,
    forecastedFixedExpenses,
    forecastedSavings,
    actualIncome,
    actualFixedExpenses,
    actualVariableExpenses,
    actualSavings,
  ] = await Promise.all([
    sumAmount({ ...periodWhere(userId, period, "INCOME"), status: { in: FORECASTED_STATUSES } }),
    sumAmount({
      ...periodWhere(userId, period, "EXPENSE"),
      status: { in: FORECASTED_STATUSES },
      recurringRuleId: { not: null },
    }),
    sumAmount({ ...periodWhere(userId, period, "SAVINGS"), status: { in: FORECASTED_STATUSES } }),
    sumAmount({ ...periodWhere(userId, period, "INCOME"), status: "COMPLETED" }),
    sumAmount({
      ...periodWhere(userId, period, "EXPENSE"),
      status: "COMPLETED",
      recurringRuleId: { not: null },
    }),
    sumAmount({
      ...periodWhere(userId, period, "EXPENSE"),
      status: "COMPLETED",
      recurringRuleId: null,
    }),
    sumAmount({ ...periodWhere(userId, period, "SAVINGS"), status: "COMPLETED" }),
  ]);

  return {
    forecastedIncome,
    forecastedFixedExpenses,
    forecastedSavings,
    actualIncome,
    actualFixedExpenses,
    actualVariableExpenses,
    actualSavings,
    alreadySpent: actualFixedExpenses + actualVariableExpenses,
    reservedExpenses: forecastedFixedExpenses - actualFixedExpenses,
    reservedSavings: forecastedSavings - actualSavings,
  };
}
