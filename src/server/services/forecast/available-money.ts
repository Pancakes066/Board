import { prisma } from "@/server/db/prisma";
import { daysInMonth, periodOf, previousPeriod, comparePeriods, type Period } from "@/lib/utils/date";
import { getMonthAggregates, type MonthAggregates } from "./calculate-forecast";

async function sumVariableExpenses(userId: string, period: Period): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      type: "EXPENSE",
      status: "COMPLETED",
      recurringRuleId: null,
      periodYear: period.year,
      periodMonth: period.month,
    },
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
}

/** At least one full month, before `now`'s month, has any completed variable spend. */
async function hasEnoughHistory(userId: string, now: Date): Promise<boolean> {
  const current = periodOf(now);
  const earlier = await prisma.transaction.findFirst({
    where: {
      userId,
      type: "EXPENSE",
      status: "COMPLETED",
      recurringRuleId: null,
      OR: [
        { periodYear: { lt: current.year } },
        { periodYear: current.year, periodMonth: { lt: current.month } },
      ],
    },
    select: { id: true },
  });
  return earlier !== null;
}

async function averageDailyVariableSpend(
  userId: string,
  now: Date,
  lookbackMonths = 3,
): Promise<number> {
  let cursor = periodOf(now);
  let totalSpend = 0;
  let totalDays = 0;

  for (let i = 0; i < lookbackMonths; i += 1) {
    cursor = previousPeriod(cursor);
    totalSpend += await sumVariableExpenses(userId, cursor);
    totalDays += daysInMonth(cursor.year, cursor.month);
  }

  return totalDays > 0 ? totalSpend / totalDays : 0;
}

async function sumBudgetCaps(userId: string): Promise<number> {
  const result = await prisma.budget.aggregate({ where: { userId }, _sum: { amountCents: true } });
  return result._sum.amountCents ?? 0;
}

/**
 * Estimates this month's total variable (non-recurring) spend: known
 * exactly for a past month, and for the current/a future month, whatever's
 * already spent plus a projection for the remaining days — from a 3-month
 * daily average once there's a month of history to average, or a budget-
 * caps fallback for a brand-new user with none yet.
 */
export async function projectedVariableSpend(
  userId: string,
  period: Period,
  now: Date,
): Promise<number> {
  const current = periodOf(now);
  const spentSoFar = await sumVariableExpenses(userId, period);

  const cmp = comparePeriods(period, current);
  if (cmp < 0) return spentSoFar; // fully in the past — nothing left to project

  const totalDays = daysInMonth(period.year, period.month);
  const isCurrent = cmp === 0;
  const daysRemaining = isCurrent ? Math.max(totalDays - now.getUTCDate(), 0) : totalDays;

  let projectedRemaining: number;
  if (await hasEnoughHistory(userId, now)) {
    const avgDaily = await averageDailyVariableSpend(userId, now);
    projectedRemaining = avgDaily * daysRemaining;
  } else {
    const budgetCapsTotal = await sumBudgetCaps(userId);
    projectedRemaining = isCurrent ? Math.max(budgetCapsTotal - spentSoFar, 0) : budgetCapsTotal;
  }

  return Math.round(spentSoFar + projectedRemaining);
}

export type Forecast = MonthAggregates & {
  projectedVariableSpend: number;
  totalForecastedExpenses: number;
  available: number;
};

export async function getForecast(userId: string, period: Period, now: Date): Promise<Forecast> {
  const [aggregates, projected] = await Promise.all([
    getMonthAggregates(userId, period),
    projectedVariableSpend(userId, period, now),
  ]);

  const totalForecastedExpenses = aggregates.forecastedFixedExpenses + projected;
  const available = aggregates.forecastedIncome - totalForecastedExpenses - aggregates.forecastedSavings;

  return {
    ...aggregates,
    projectedVariableSpend: projected,
    totalForecastedExpenses,
    available,
  };
}
