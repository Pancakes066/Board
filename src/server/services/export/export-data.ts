import { prisma } from "@/server/db/prisma";

/** Every row Board owns for this user, scoped by userId — the full JSON export. */
export async function getFullUserExport(userId: string) {
  const [user, categories, recurringRules, transactions, budgets, savingsGoals] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          currency: true,
          startingBalanceCents: true,
          startingBalanceDate: true,
          createdAt: true,
        },
      }),
      prisma.category.findMany({ where: { userId } }),
      prisma.recurringRule.findMany({ where: { userId } }),
      prisma.transaction.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.budget.findMany({ where: { userId } }),
      prisma.savingsGoal.findMany({ where: { userId } }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    user,
    categories,
    recurringRules,
    transactions,
    budgets,
    savingsGoals,
  };
}

type ExportedTransaction = Awaited<ReturnType<typeof getFullUserExport>>["transactions"][number];

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** CSV covers transactions only — the one table people actually want in a
 * spreadsheet. The full JSON export is the complete, lossless copy. */
export function transactionsToCsv(transactions: ExportedTransaction[]): string {
  const header = ["date", "type", "status", "amountCents", "categoryId", "notes"];
  const rows = transactions.map((t) =>
    [
      t.date.toISOString().slice(0, 10),
      t.type,
      t.status,
      String(t.amountCents),
      t.categoryId,
      t.notes ?? "",
    ].map(csvField),
  );
  return [header.map(csvField), ...rows].map((row) => row.join(",")).join("\n");
}
