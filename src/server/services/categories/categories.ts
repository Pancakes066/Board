import { prisma } from "@/server/db/prisma";
import type { CategoryInput } from "@/lib/validation/category";

/** Default (global) categories plus this user's own custom ones. */
export function listCategoriesForUser(userId: string) {
  return prisma.category.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function createCategory(userId: string, input: CategoryInput) {
  const existing = await prisma.category.findFirst({
    where: { userId, name: input.name },
  });
  if (existing) {
    throw new Error("Vous avez déjà une catégorie avec ce nom.");
  }

  return prisma.category.create({
    data: { ...input, userId, isDefault: false },
  });
}

async function getOwnedCustomCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.isDefault || category.userId !== userId) {
    throw new Error("Catégorie introuvable.");
  }
  return category;
}

export async function updateCategory(userId: string, categoryId: string, input: CategoryInput) {
  await getOwnedCustomCategory(userId, categoryId);

  const conflict = await prisma.category.findFirst({
    where: { userId, name: input.name, NOT: { id: categoryId } },
  });
  if (conflict) {
    throw new Error("Vous avez déjà une catégorie avec ce nom.");
  }

  return prisma.category.update({ where: { id: categoryId }, data: input });
}

export async function deleteCategory(userId: string, categoryId: string) {
  await getOwnedCustomCategory(userId, categoryId);

  const [ruleCount, transactionCount, budgetCount] = await Promise.all([
    prisma.recurringRule.count({ where: { categoryId } }),
    prisma.transaction.count({ where: { categoryId } }),
    prisma.budget.count({ where: { categoryId } }),
  ]);

  if (ruleCount + transactionCount + budgetCount > 0) {
    throw new Error(
      "Cette catégorie est utilisée par au moins une règle, transaction ou un budget, et ne peut pas être supprimée.",
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });
}
