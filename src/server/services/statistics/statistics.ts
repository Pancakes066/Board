import { prisma } from "@/server/db/prisma";
import {
  daysInMonth,
  periodOf,
  previousPeriod,
  comparePeriods,
  MONTH_LABELS_SHORT,
  type Period,
} from "@/lib/utils/date";

export type CategoryBreakdownRow = {
  categoryId: string;
  name: string;
  emoji: string | null;
  spentCents: number;
  previousSpentCents: number;
};

/** Spending by category this period (COMPLETED expenses only), plus the
 * same category's spend last period so the biggest mover can be found
 * without a second round trip. */
export async function getCategoryBreakdown(
  userId: string,
  period: Period,
): Promise<CategoryBreakdownRow[]> {
  const previous = previousPeriod(period);

  const [current, prior, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", status: "COMPLETED", periodYear: period.year, periodMonth: period.month },
      _sum: { amountCents: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        status: "COMPLETED",
        periodYear: previous.year,
        periodMonth: previous.month,
      },
      _sum: { amountCents: true },
    }),
    prisma.category.findMany({ where: { OR: [{ userId: null }, { userId }] } }),
  ]);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const priorByCategory = new Map(prior.map((p) => [p.categoryId, p._sum.amountCents ?? 0]));

  return current
    .map((row) => {
      const category = categoryById.get(row.categoryId);
      return {
        categoryId: row.categoryId,
        name: category?.name ?? "Autre",
        emoji: category?.emoji ?? null,
        spentCents: row._sum.amountCents ?? 0,
        previousSpentCents: priorByCategory.get(row.categoryId) ?? 0,
      };
    })
    .sort((a, b) => b.spentCents - a.spentCents);
}

export type MonthlyEvolutionPoint = {
  period: Period;
  label: string;
  incomeCents: number;
  expenseCents: number;
  savingsCents: number;
};

/** The last `months` calendar months (oldest first), income/expense/
 * savings totals from COMPLETED transactions only — actuals, not forecasts;
 * statistics look backward. */
export async function getMonthlyEvolution(
  userId: string,
  now: Date,
  months = 6,
): Promise<MonthlyEvolutionPoint[]> {
  const periods: Period[] = [];
  let cursor = periodOf(now);
  for (let i = 0; i < months; i += 1) {
    periods.unshift(cursor);
    cursor = previousPeriod(cursor);
  }

  const grouped = await prisma.transaction.groupBy({
    by: ["periodYear", "periodMonth", "type"],
    where: {
      userId,
      status: "COMPLETED",
      OR: periods.map((p) => ({ periodYear: p.year, periodMonth: p.month })),
    },
    _sum: { amountCents: true },
  });

  return periods.map((period) => {
    const forType = (type: "INCOME" | "EXPENSE" | "SAVINGS") =>
      grouped
        .filter((g) => g.periodYear === period.year && g.periodMonth === period.month && g.type === type)
        .reduce((sum, g) => sum + (g._sum.amountCents ?? 0), 0);

    return {
      period,
      label: `${MONTH_LABELS_SHORT[period.month - 1]} ${String(period.year).slice(2)}`,
      incomeCents: forType("INCOME"),
      expenseCents: forType("EXPENSE"),
      savingsCents: forType("SAVINGS"),
    };
  });
}

export type FixedVsVariable = { fixedCents: number; variableCents: number };

export async function getFixedVsVariable(userId: string, period: Period): Promise<FixedVsVariable> {
  const [fixed, variable] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        status: "COMPLETED",
        recurringRuleId: { not: null },
        periodYear: period.year,
        periodMonth: period.month,
      },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        status: "COMPLETED",
        recurringRuleId: null,
        periodYear: period.year,
        periodMonth: period.month,
      },
      _sum: { amountCents: true },
    }),
  ]);

  return {
    fixedCents: fixed._sum.amountCents ?? 0,
    variableCents: variable._sum.amountCents ?? 0,
  };
}

/** Total completed spend this period divided by days elapsed (the full
 * month once it's in the past, today's day-of-month while it's current). */
export async function getAverageDailySpend(
  userId: string,
  period: Period,
  now: Date,
): Promise<number> {
  const total = await prisma.transaction.aggregate({
    where: { userId, type: "EXPENSE", status: "COMPLETED", periodYear: period.year, periodMonth: period.month },
    _sum: { amountCents: true },
  });

  const current = periodOf(now);
  const isCurrent = comparePeriods(period, current) === 0;
  const elapsedDays = isCurrent ? now.getUTCDate() : daysInMonth(period.year, period.month);

  return elapsedDays > 0 ? Math.round((total._sum.amountCents ?? 0) / elapsedDays) : 0;
}
