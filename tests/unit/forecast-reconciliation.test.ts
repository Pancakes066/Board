import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/prisma";
import { generateOccurrencesForPeriod } from "@/server/services/recurrence/generate-month";
import { getForecast } from "@/server/services/forecast/available-money";
import { periodOf } from "@/lib/utils/date";
import { createTestUser } from "../helpers/test-user";

let cleanup: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (cleanup) await cleanup();
  cleanup = null;
});

describe("getForecast reconciliation", () => {
  it("Available == ForecastedIncome - TotalForecastedExpenses - ForecastedSavings, always", async () => {
    const { user, category, cleanup: c } = await createTestUser();
    cleanup = c;
    const now = new Date(Date.UTC(2026, 8, 24)); // Sept 24, 2026
    const period = periodOf(now);

    await prisma.recurringRule.createMany({
      data: [
        {
          userId: user.id,
          type: "INCOME",
          name: "Salaire",
          amountCents: 170000,
          frequency: "MONTHLY",
          dayOfMonth: 1,
          startDate: new Date(Date.UTC(2020, 0, 1)),
          categoryId: category.id,
        },
        {
          userId: user.id,
          type: "EXPENSE",
          name: "Loyer",
          amountCents: 65000,
          frequency: "MONTHLY",
          dayOfMonth: 3,
          startDate: new Date(Date.UTC(2020, 0, 1)),
          categoryId: category.id,
        },
        {
          userId: user.id,
          type: "SAVINGS",
          name: "Épargne",
          amountCents: 20000,
          frequency: "MONTHLY",
          dayOfMonth: 5,
          startDate: new Date(Date.UTC(2020, 0, 1)),
          categoryId: category.id,
        },
      ],
    });
    await generateOccurrencesForPeriod(user.id, period);

    // A bit of variable spend already logged this month, so
    // projectedVariableSpend isn't trivially zero.
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "EXPENSE",
        status: "COMPLETED",
        amountCents: 4500,
        categoryId: category.id,
        sourceDate: new Date(Date.UTC(2026, 8, 10)),
        date: new Date(Date.UTC(2026, 8, 10)),
        periodYear: period.year,
        periodMonth: period.month,
      },
    });

    const forecast = await getForecast(user.id, period, now);

    const expectedAvailable =
      forecast.forecastedIncome - forecast.totalForecastedExpenses - forecast.forecastedSavings;
    expect(forecast.available).toBe(expectedAvailable);
    expect(forecast.totalForecastedExpenses).toBe(
      forecast.forecastedFixedExpenses + forecast.projectedVariableSpend,
    );

    // Concrete numbers too, not just the algebraic identity.
    expect(forecast.forecastedIncome).toBe(170000);
    expect(forecast.forecastedFixedExpenses).toBe(65000);
    expect(forecast.forecastedSavings).toBe(20000);
    // No budgets and no prior-month history -> projected variable spend is
    // exactly what's already logged (the budget-fallback projects 0 more).
    expect(forecast.projectedVariableSpend).toBe(4500);
    expect(forecast.available).toBe(170000 - (65000 + 4500) - 20000);
  });

  it("reconciles the spec's own worked example (1700 income / 820 total expenses / 200 savings -> 680)", async () => {
    const { user, category, cleanup: c } = await createTestUser();
    cleanup = c;
    const now = new Date(Date.UTC(2026, 8, 24));
    const period = periodOf(now);

    await prisma.recurringRule.createMany({
      data: [
        {
          userId: user.id,
          type: "INCOME",
          name: "Salaire",
          amountCents: 170000,
          frequency: "MONTHLY",
          dayOfMonth: 1,
          startDate: new Date(Date.UTC(2020, 0, 1)),
          categoryId: category.id,
        },
        {
          userId: user.id,
          type: "EXPENSE",
          name: "ChargesFixes",
          amountCents: 82000,
          frequency: "MONTHLY",
          dayOfMonth: 3,
          startDate: new Date(Date.UTC(2020, 0, 1)),
          categoryId: category.id,
        },
        {
          userId: user.id,
          type: "SAVINGS",
          name: "Épargne",
          amountCents: 20000,
          frequency: "MONTHLY",
          dayOfMonth: 5,
          startDate: new Date(Date.UTC(2020, 0, 1)),
          categoryId: category.id,
        },
      ],
    });
    await generateOccurrencesForPeriod(user.id, period);

    const forecast = await getForecast(user.id, period, now);
    expect(forecast.available).toBe(68000); // 680,00 €
  });
});
