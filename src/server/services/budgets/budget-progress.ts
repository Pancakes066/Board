import { prisma } from "@/server/db/prisma";
import type { Period } from "@/lib/utils/date";
import type { BudgetInput } from "@/lib/validation/budget";

export type BudgetWithProgress = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string | null;
  categoryColor: string | null;
  capCents: number;
  spentCents: number;
  /** 0-100+, uncapped so an overspend is visible in the raw number even
   * though the progress bar itself visually caps its fill at 100%. */
  progressPct: number;
};

/** Every EXPENSE actually paid in that category this period, regardless
 * of whether it came from a recurring rule or was entered manually — a
 * budget cap covers all spending in the category, not just the variable
 * part. */
async function getSpentByCategory(userId: string, period: Period): Promise<Map<string, number>> {
  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      status: "COMPLETED",
      periodYear: period.year,
      periodMonth: period.month,
    },
    _sum: { amountCents: true },
  });

  return new Map(grouped.map((g) => [g.categoryId, g._sum.amountCents ?? 0]));
}

export async function listBudgetsWithProgress(
  userId: string,
  period: Period,
): Promise<BudgetWithProgress[]> {
  const [budgets, spentByCategory] = await Promise.all([
    prisma.budget.findMany({ where: { userId }, include: { category: true } }),
    getSpentByCategory(userId, period),
  ]);

  return budgets
    .map((budget) => {
      const spentCents = spentByCategory.get(budget.categoryId) ?? 0;
      return {
        id: budget.id,
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        categoryEmoji: budget.category.emoji,
        categoryColor: budget.category.color,
        capCents: budget.amountCents,
        spentCents,
        progressPct: budget.amountCents > 0 ? Math.round((spentCents / budget.amountCents) * 100) : 0,
      };
    })
    .sort((a, b) => b.progressPct - a.progressPct);
}

async function assertValidCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || (category.userId !== null && category.userId !== userId)) {
    throw new Error("Catégorie invalide.");
  }
}

/** One budget per category — setting it again just updates the cap. */
export async function setBudget(userId: string, input: BudgetInput) {
  await assertValidCategory(userId, input.categoryId);

  return prisma.budget.upsert({
    where: { userId_categoryId: { userId, categoryId: input.categoryId } },
    update: { amountCents: input.amountCents },
    create: { userId, categoryId: input.categoryId, amountCents: input.amountCents },
  });
}

export async function deleteBudget(userId: string, budgetId: string) {
  const budget = await prisma.budget.findUnique({ where: { id: budgetId } });
  if (!budget || budget.userId !== userId) {
    throw new Error("Budget introuvable.");
  }
  await prisma.budget.delete({ where: { id: budgetId } });
}
