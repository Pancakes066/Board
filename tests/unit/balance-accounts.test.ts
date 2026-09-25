import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/prisma";
import { getCurrentBalance } from "@/server/services/forecast/balance";
import { createTestUser } from "../helpers/test-user";

let cleanup: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (cleanup) await cleanup();
  cleanup = null;
});

describe("getCurrentBalance", () => {
  it("regression: omitting accountId behaves exactly as before (User-wide balance)", async () => {
    const { user, category, cleanup: c } = await createTestUser();
    cleanup = c;
    const now = new Date(Date.UTC(2026, 8, 24));

    await prisma.user.update({
      where: { id: user.id },
      data: { startingBalanceCents: 100000, startingBalanceDate: new Date(Date.UTC(2026, 0, 1)) },
    });
    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          type: "INCOME",
          status: "COMPLETED",
          amountCents: 170000,
          categoryId: category.id,
          sourceDate: new Date(Date.UTC(2026, 8, 1)),
          date: new Date(Date.UTC(2026, 8, 1)),
          periodYear: 2026,
          periodMonth: 9,
        },
        {
          userId: user.id,
          type: "EXPENSE",
          status: "COMPLETED",
          amountCents: 65000,
          categoryId: category.id,
          sourceDate: new Date(Date.UTC(2026, 8, 5)),
          date: new Date(Date.UTC(2026, 8, 5)),
          periodYear: 2026,
          periodMonth: 9,
        },
      ],
    });

    const balance = await getCurrentBalance(user.id, now);
    expect(balance).toBe(100000 + 170000 - 65000);
  });

  it("scopes to a single account's own starting balance + its own transactions when accountId is passed", async () => {
    const { user, category, cleanup: c } = await createTestUser();
    cleanup = c;
    const now = new Date(Date.UTC(2026, 8, 24));

    const checking = await prisma.financialAccount.create({
      data: { userId: user.id, name: "Courant", type: "CHECKING", startingBalanceCents: 124000 },
    });
    const savings = await prisma.financialAccount.create({
      data: { userId: user.id, name: "Livret", type: "SAVINGS_BOOK", startingBalanceCents: 350000 },
    });

    // A transaction tagged to `checking` and one untagged (no accountId) —
    // only the tagged one should count toward checking's balance.
    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          accountId: checking.id,
          type: "EXPENSE",
          status: "COMPLETED",
          amountCents: 1112,
          categoryId: category.id,
          sourceDate: new Date(Date.UTC(2026, 8, 12)),
          date: new Date(Date.UTC(2026, 8, 12)),
          periodYear: 2026,
          periodMonth: 9,
        },
        {
          userId: user.id,
          type: "EXPENSE",
          status: "COMPLETED",
          amountCents: 99999,
          categoryId: category.id,
          sourceDate: new Date(Date.UTC(2026, 8, 12)),
          date: new Date(Date.UTC(2026, 8, 12)),
          periodYear: 2026,
          periodMonth: 9,
        },
      ],
    });

    const checkingBalance = await getCurrentBalance(user.id, now, checking.id);
    expect(checkingBalance).toBe(124000 - 1112);

    const savingsBalance = await getCurrentBalance(user.id, now, savings.id);
    expect(savingsBalance).toBe(350000);
  });

  it("a transfer moves the balance between the two accounts without touching a third", async () => {
    const { user, cleanup: c } = await createTestUser();
    cleanup = c;
    const now = new Date(Date.UTC(2026, 8, 24));

    const checking = await prisma.financialAccount.create({
      data: { userId: user.id, name: "Courant", type: "CHECKING", startingBalanceCents: 124000 },
    });
    const savings = await prisma.financialAccount.create({
      data: { userId: user.id, name: "Livret", type: "SAVINGS_BOOK", startingBalanceCents: 350000 },
    });

    await prisma.accountTransfer.create({
      data: {
        userId: user.id,
        fromAccountId: checking.id,
        toAccountId: savings.id,
        amountCents: 50000,
        date: new Date(Date.UTC(2026, 8, 10)),
      },
    });

    expect(await getCurrentBalance(user.id, now, checking.id)).toBe(124000 - 50000);
    expect(await getCurrentBalance(user.id, now, savings.id)).toBe(350000 + 50000);

    await prisma.accountTransfer.deleteMany({ where: { userId: user.id } });
  });
});
