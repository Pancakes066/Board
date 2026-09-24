import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/prisma";
import { generateOccurrencesForPeriod } from "@/server/services/recurrence/generate-month";
import { generateRollingWindow, onRecurringRuleUpdated } from "@/server/services/recurrence/sync-forward";
import { createTestUser } from "../helpers/test-user";

let cleanup: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (cleanup) await cleanup();
  cleanup = null;
});

describe("generateOccurrencesForPeriod", () => {
  it("is idempotent — re-running it creates no duplicates", async () => {
    const { user, category, cleanup: c } = await createTestUser();
    cleanup = c;

    const rule = await prisma.recurringRule.create({
      data: {
        userId: user.id,
        type: "EXPENSE",
        name: "Loyer",
        amountCents: 65000,
        frequency: "MONTHLY",
        dayOfMonth: 3,
        startDate: new Date(Date.UTC(2020, 0, 1)),
        categoryId: category.id,
      },
    });

    await generateOccurrencesForPeriod(user.id, { year: 2026, month: 9 });
    await generateOccurrencesForPeriod(user.id, { year: 2026, month: 9 });
    await generateOccurrencesForPeriod(user.id, { year: 2026, month: 9 });

    const occurrences = await prisma.transaction.findMany({ where: { recurringRuleId: rule.id } });
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].amountCents).toBe(65000);
    expect(occurrences[0].status).toBe("PLANNED");
  });

  it("backfills a rule created mid-month with a dayOfMonth earlier than today", async () => {
    const { user, category, cleanup: c } = await createTestUser();
    cleanup = c;

    // Simulates "today" being the 20th, and the rule firing on the 5th —
    // the 5th of *this* month is in the past, but should still be
    // generated as PLANNED (the user can mark it completed retroactively).
    const rule = await prisma.recurringRule.create({
      data: {
        userId: user.id,
        type: "EXPENSE",
        name: "Internet",
        amountCents: 3000,
        frequency: "MONTHLY",
        dayOfMonth: 5,
        startDate: new Date(Date.UTC(2026, 8, 1)),
        categoryId: category.id,
      },
    });

    await generateOccurrencesForPeriod(user.id, { year: 2026, month: 9 });

    const occurrence = await prisma.transaction.findFirst({ where: { recurringRuleId: rule.id } });
    expect(occurrence).not.toBeNull();
    expect(occurrence!.sourceDate.toISOString()).toBe("2026-09-05T00:00:00.000Z");
    expect(occurrence!.status).toBe("PLANNED");
  });

  it("generateRollingWindow covers the current and next month only", async () => {
    const { user, category, cleanup: c } = await createTestUser();
    cleanup = c;

    await prisma.recurringRule.create({
      data: {
        userId: user.id,
        type: "INCOME",
        name: "Salaire",
        amountCents: 170000,
        frequency: "MONTHLY",
        dayOfMonth: 1,
        startDate: new Date(Date.UTC(2020, 0, 1)),
        categoryId: category.id,
      },
    });

    await generateRollingWindow(user.id, new Date(Date.UTC(2026, 8, 24))); // "now" = Sept 24, 2026

    const occurrences = await prisma.transaction.findMany({ where: { userId: user.id } });
    const periods = occurrences.map((o) => `${o.periodYear}-${o.periodMonth}`).sort();
    expect(periods).toEqual(["2026-10", "2026-9"]);
  });
});

describe("onRecurringRuleUpdated", () => {
  async function setupRule(user: { id: string }, categoryId: string) {
    return prisma.recurringRule.create({
      data: {
        userId: user.id,
        type: "EXPENSE",
        name: "Spotify",
        amountCents: 1112,
        frequency: "MONTHLY",
        dayOfMonth: 12,
        startDate: new Date(Date.UTC(2020, 0, 1)),
        categoryId,
      },
    });
  }

  it("regenerates future planned occurrences after an edit (amount change)", async () => {
    const { user, category, cleanup: c } = await createTestUser();
    cleanup = c;
    const rule = await setupRule(user, category.id);
    const now = new Date(Date.UTC(2026, 8, 24));

    await generateOccurrencesForPeriod(user.id, { year: 2026, month: 9 });
    await prisma.recurringRule.update({ where: { id: rule.id }, data: { amountCents: 1500 } });
    await onRecurringRuleUpdated(user.id, rule.id, now);

    const occurrence = await prisma.transaction.findFirst({
      where: { recurringRuleId: rule.id, periodYear: 2026, periodMonth: 9 },
    });
    expect(occurrence!.amountCents).toBe(1500);
  });

  it("never touches a COMPLETED occurrence", async () => {
    const { user, category, cleanup: c } = await createTestUser();
    cleanup = c;
    const rule = await setupRule(user, category.id);
    const now = new Date(Date.UTC(2026, 8, 24));

    await generateOccurrencesForPeriod(user.id, { year: 2026, month: 9 });
    await prisma.transaction.updateMany({
      where: { recurringRuleId: rule.id },
      data: { status: "COMPLETED" },
    });

    await onRecurringRuleUpdated(user.id, rule.id, now);

    const occurrence = await prisma.transaction.findFirst({ where: { recurringRuleId: rule.id } });
    expect(occurrence).not.toBeNull();
    expect(occurrence!.status).toBe("COMPLETED");
    expect(occurrence!.amountCents).toBe(1112); // untouched, not deleted-and-regenerated
  });

  it("never touches a per-occurrence override (isModified), matching the spec's salary example", async () => {
    const { user, category, cleanup: c } = await createTestUser();
    cleanup = c;
    const rule = await prisma.recurringRule.create({
      data: {
        userId: user.id,
        type: "INCOME",
        name: "Salaire",
        amountCents: 170000,
        frequency: "MONTHLY",
        dayOfMonth: 1,
        startDate: new Date(Date.UTC(2020, 0, 1)),
        categoryId: category.id,
      },
    });
    const now = new Date(Date.UTC(2026, 8, 24));

    await generateOccurrencesForPeriod(user.id, { year: 2026, month: 9 });
    // User overrides September's occurrence to 1850 (one-off bonus month).
    await prisma.transaction.updateMany({
      where: { recurringRuleId: rule.id, periodYear: 2026, periodMonth: 9 },
      data: { amountCents: 185000, isModified: true },
    });

    // A later, unrelated edit to the rule (e.g. changing its category) must
    // not clobber the override.
    await onRecurringRuleUpdated(user.id, rule.id, now);

    const september = await prisma.transaction.findFirst({
      where: { recurringRuleId: rule.id, periodYear: 2026, periodMonth: 9 },
    });
    expect(september!.amountCents).toBe(185000);
    expect(september!.isModified).toBe(true);

    // The rule itself still reads its normal amount going forward.
    const ruleAfter = await prisma.recurringRule.findUniqueOrThrow({ where: { id: rule.id } });
    expect(ruleAfter.amountCents).toBe(170000);
  });

  it("preserves a SKIPPED occurrence instead of resurrecting it", async () => {
    const { user, category, cleanup: c } = await createTestUser();
    cleanup = c;
    const rule = await setupRule(user, category.id);
    const now = new Date(Date.UTC(2026, 8, 24));

    await generateOccurrencesForPeriod(user.id, { year: 2026, month: 9 });
    await prisma.transaction.updateMany({
      where: { recurringRuleId: rule.id, periodYear: 2026, periodMonth: 9 },
      data: { status: "SKIPPED" },
    });

    await onRecurringRuleUpdated(user.id, rule.id, now);
    // Re-running plain generation afterwards must not resurrect it either.
    await generateOccurrencesForPeriod(user.id, { year: 2026, month: 9 });

    const occurrences = await prisma.transaction.findMany({
      where: { recurringRuleId: rule.id, periodYear: 2026, periodMonth: 9 },
    });
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].status).toBe("SKIPPED");
  });

  it("removes a future occurrence that falls outside the rule's range after it's stopped", async () => {
    const { user, category, cleanup: c } = await createTestUser();
    cleanup = c;
    const rule = await setupRule(user, category.id);
    const now = new Date(Date.UTC(2026, 8, 24));

    await generateRollingWindow(user.id, now); // generates Sept + Oct

    let occurrences = await prisma.transaction.findMany({ where: { recurringRuleId: rule.id } });
    expect(occurrences).toHaveLength(2);

    // Stop the rule today — October's occurrence should no longer exist.
    await prisma.recurringRule.update({ where: { id: rule.id }, data: { endDate: now } });
    await onRecurringRuleUpdated(user.id, rule.id, now);

    occurrences = await prisma.transaction.findMany({ where: { recurringRuleId: rule.id } });
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].periodMonth).toBe(9);
  });
});
