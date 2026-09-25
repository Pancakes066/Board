import { prisma } from "@/server/db/prisma";
import { getCurrentBalance } from "@/server/services/forecast/balance";
import type { FinancialAccountInput } from "@/lib/validation/financial-account";

export type FinancialAccountWithBalance = {
  id: string;
  name: string;
  type: "CHECKING" | "SAVINGS_BOOK" | "CARD" | "CASH" | "OTHER";
  currency: string;
  description: string | null;
  isActive: boolean;
  balanceCents: number;
};

async function getOwnedAccount(userId: string, accountId: string) {
  const account = await prisma.financialAccount.findUnique({ where: { id: accountId } });
  if (!account || account.userId !== userId) {
    throw new Error("Compte introuvable.");
  }
  return account;
}

/** Lightweight list for a "link to an account" select — no balance math. */
export function listAccountOptions(userId: string) {
  return prisma.financialAccount.findMany({
    where: { userId, isActive: true },
    select: { id: true, name: true, type: true, currency: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function listAccountsWithBalance(
  userId: string,
  now: Date,
): Promise<FinancialAccountWithBalance[]> {
  const accounts = await prisma.financialAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const balances = await Promise.all(
    accounts.map((account) => getCurrentBalance(userId, now, account.id)),
  );

  return accounts.map((account, i) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    description: account.description,
    isActive: account.isActive,
    balanceCents: balances[i],
  }));
}

/** Totals per currency — never naively summed across different
 * currencies, so a user with a USD and a EUR account sees two honest
 * totals rather than one meaningless number. */
export function totalsByCurrency(
  accounts: FinancialAccountWithBalance[],
): { currency: string; totalCents: number }[] {
  const totals = new Map<string, number>();
  for (const account of accounts) {
    if (!account.isActive) continue;
    totals.set(account.currency, (totals.get(account.currency) ?? 0) + account.balanceCents);
  }
  return Array.from(totals, ([currency, totalCents]) => ({ currency, totalCents }));
}

export async function createAccount(userId: string, input: FinancialAccountInput) {
  return prisma.financialAccount.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      currency: input.currency,
      startingBalanceCents: input.startingBalanceCents ?? 0,
      // Left null (never "now"): a transaction/transfer can only ever be
      // tagged with this account's id after the account exists, so there
      // is nothing to anchor against — and setting it to a full
      // now()-with-time would wrongly exclude same-day, date-only
      // (midnight UTC) transactions/transfers created moments later.
      description: input.description,
      isActive: input.isActive,
    },
  });
}

export async function updateAccount(
  userId: string,
  accountId: string,
  input: FinancialAccountInput,
) {
  await getOwnedAccount(userId, accountId);
  return prisma.financialAccount.update({
    where: { id: accountId },
    data: {
      name: input.name,
      type: input.type,
      currency: input.currency,
      description: input.description,
      isActive: input.isActive,
    },
  });
}

/** Un-links (doesn't destroy) everything pointed at this account before
 * deleting it — an account is a label, never an owner; deleting it must
 * never take transactions/rules/goals with it. */
export async function deleteAccount(userId: string, accountId: string) {
  await getOwnedAccount(userId, accountId);
  await prisma.$transaction([
    prisma.transaction.updateMany({ where: { accountId }, data: { accountId: null } }),
    prisma.recurringRule.updateMany({ where: { accountId }, data: { accountId: null } }),
    prisma.savingsGoal.updateMany({ where: { accountId }, data: { accountId: null } }),
    prisma.financialAccount.delete({ where: { id: accountId } }),
  ]);
}
