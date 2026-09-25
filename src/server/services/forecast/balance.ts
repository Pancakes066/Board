import { prisma } from "@/server/db/prisma";

/**
 * startingBalanceCents + the signed sum of every COMPLETED transaction
 * since startingBalanceDate (or the beginning, if that's never been set).
 * Income adds, expense and savings both leave the spending pool.
 *
 * Pass `accountId` to scope this to a single financial account instead of
 * the user's overall balance: the starting balance/date then come from
 * that FinancialAccount (not the User), only transactions tagged with
 * that accountId count, and transfers in/out of that account are also
 * included (transfers never touch the user-wide calculation, since they
 * cancel out across the user's own accounts). Omitting `accountId`
 * reproduces the exact previous behavior — no regression for any
 * existing caller.
 */
export async function getCurrentBalance(
  userId: string,
  asOf: Date,
  accountId?: string,
): Promise<number> {
  if (accountId) {
    const account = await prisma.financialAccount.findFirstOrThrow({
      where: { id: accountId, userId },
      select: { startingBalanceCents: true, startingBalanceDate: true },
    });
    const since = account.startingBalanceDate ?? new Date(0);

    const [incomeSum, expenseSum, savingsSum, transfersIn, transfersOut] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          accountId,
          type: "INCOME",
          status: "COMPLETED",
          date: { gte: since, lte: asOf },
        },
        _sum: { amountCents: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          accountId,
          type: "EXPENSE",
          status: "COMPLETED",
          date: { gte: since, lte: asOf },
        },
        _sum: { amountCents: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          accountId,
          type: "SAVINGS",
          status: "COMPLETED",
          date: { gte: since, lte: asOf },
        },
        _sum: { amountCents: true },
      }),
      prisma.accountTransfer.aggregate({
        where: { userId, toAccountId: accountId, date: { gte: since, lte: asOf } },
        _sum: { amountCents: true },
      }),
      prisma.accountTransfer.aggregate({
        where: { userId, fromAccountId: accountId, date: { gte: since, lte: asOf } },
        _sum: { amountCents: true },
      }),
    ]);

    const signedSum =
      (incomeSum._sum.amountCents ?? 0) -
      (expenseSum._sum.amountCents ?? 0) -
      (savingsSum._sum.amountCents ?? 0) +
      (transfersIn._sum.amountCents ?? 0) -
      (transfersOut._sum.amountCents ?? 0);

    return account.startingBalanceCents + signedSum;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { startingBalanceCents: true, startingBalanceDate: true },
  });
  const since = user.startingBalanceDate ?? new Date(0);

  const [incomeSum, expenseSum, savingsSum] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: "INCOME", status: "COMPLETED", date: { gte: since, lte: asOf } },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "EXPENSE", status: "COMPLETED", date: { gte: since, lte: asOf } },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: "SAVINGS", status: "COMPLETED", date: { gte: since, lte: asOf } },
      _sum: { amountCents: true },
    }),
  ]);

  const signedSum =
    (incomeSum._sum.amountCents ?? 0) -
    (expenseSum._sum.amountCents ?? 0) -
    (savingsSum._sum.amountCents ?? 0);

  return user.startingBalanceCents + signedSum;
}

export type BalancePoint = { date: string; balanceCents: number };

/**
 * The running balance over the trailing `lookbackMonths`, one point per
 * day that has at least one completed transaction (multiple same-day
 * transactions collapse into one point), anchored by the balance carried
 * in from before the window and extended to `now` so the line always
 * reaches today even if nothing happened recently.
 */
export async function getBalanceHistory(
  userId: string,
  now: Date,
  lookbackMonths = 6,
): Promise<BalancePoint[]> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { startingBalanceDate: true },
  });

  const windowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - lookbackMonths, now.getUTCDate()),
  );
  const anchor = user.startingBalanceDate ?? new Date(0);
  const effectiveStart = anchor > windowStart ? anchor : windowStart;

  const balanceBeforeWindow = await getCurrentBalance(
    userId,
    new Date(effectiveStart.getTime() - 1),
  );

  const transactions = await prisma.transaction.findMany({
    where: { userId, status: "COMPLETED", date: { gte: effectiveStart, lte: now } },
    orderBy: { date: "asc" },
    select: { date: true, type: true, amountCents: true },
  });

  const points: BalancePoint[] = [
    { date: effectiveStart.toISOString().slice(0, 10), balanceCents: balanceBeforeWindow },
  ];

  let running = balanceBeforeWindow;
  for (const t of transactions) {
    running += t.type === "INCOME" ? t.amountCents : -t.amountCents;
    const dateKey = t.date.toISOString().slice(0, 10);
    const last = points[points.length - 1];
    if (last.date === dateKey) {
      last.balanceCents = running;
    } else {
      points.push({ date: dateKey, balanceCents: running });
    }
  }

  const nowKey = now.toISOString().slice(0, 10);
  if (points[points.length - 1].date !== nowKey) {
    points.push({ date: nowKey, balanceCents: running });
  }

  return points;
}
