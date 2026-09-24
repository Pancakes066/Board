import { prisma } from "@/server/db/prisma";
import type { RecurringRuleInput } from "@/lib/validation/recurring-rule";

export function listRecurringRulesForUser(userId: string) {
  return prisma.recurringRule.findMany({
    where: { userId },
    include: { category: true },
    orderBy: [{ name: "asc" }],
  });
}

async function assertValidCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || (category.userId !== null && category.userId !== userId)) {
    throw new Error("Catégorie invalide.");
  }
}

async function assertValidSavingsGoal(userId: string, savingsGoalId: string | undefined) {
  if (!savingsGoalId) return;
  const goal = await prisma.savingsGoal.findUnique({ where: { id: savingsGoalId } });
  if (!goal || goal.userId !== userId) {
    throw new Error("Objectif d'épargne invalide.");
  }
}

async function getOwnedRule(userId: string, ruleId: string) {
  const rule = await prisma.recurringRule.findUnique({ where: { id: ruleId } });
  if (!rule || rule.userId !== userId) {
    throw new Error("Règle introuvable.");
  }
  return rule;
}

export async function createRecurringRule(userId: string, input: RecurringRuleInput) {
  await assertValidCategory(userId, input.categoryId);
  const savingsGoalId = input.type === "SAVINGS" ? input.savingsGoalId : undefined;
  await assertValidSavingsGoal(userId, savingsGoalId);

  return prisma.recurringRule.create({
    data: {
      userId,
      type: input.type,
      name: input.name,
      amountCents: input.amountCents,
      frequency: input.frequency,
      dayOfMonth: input.dayOfMonth,
      month: input.month,
      dayOfWeek: input.dayOfWeek,
      categoryId: input.categoryId,
      savingsGoalId: savingsGoalId ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      isSubscription: input.type === "EXPENSE" ? input.isSubscription : false,
    },
  });
}

export async function updateRecurringRule(
  userId: string,
  ruleId: string,
  input: RecurringRuleInput,
) {
  await getOwnedRule(userId, ruleId);
  await assertValidCategory(userId, input.categoryId);
  const savingsGoalId = input.type === "SAVINGS" ? input.savingsGoalId : undefined;
  await assertValidSavingsGoal(userId, savingsGoalId);

  return prisma.recurringRule.update({
    where: { id: ruleId },
    data: {
      type: input.type,
      name: input.name,
      amountCents: input.amountCents,
      frequency: input.frequency,
      dayOfMonth: input.dayOfMonth,
      month: input.month,
      dayOfWeek: input.dayOfWeek,
      categoryId: input.categoryId,
      savingsGoalId: savingsGoalId ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      isSubscription: input.type === "EXPENSE" ? input.isSubscription : false,
    },
  });
}

/**
 * Deactivates the rule (endDate = now) instead of deleting it. This is the
 * normal way to end a recurring rule: RecurringRule -> Transaction is
 * onDelete: Cascade, so a hard delete would wipe every occurrence it ever
 * generated, including completed history. "Stop" preserves all of that.
 */
export async function stopRecurringRule(userId: string, ruleId: string) {
  await getOwnedRule(userId, ruleId);
  return prisma.recurringRule.update({ where: { id: ruleId }, data: { endDate: new Date() } });
}

export async function reactivateRecurringRule(userId: string, ruleId: string) {
  await getOwnedRule(userId, ruleId);
  return prisma.recurringRule.update({ where: { id: ruleId }, data: { endDate: null } });
}

/**
 * A true delete is only offered for a rule that never generated anything
 * (the "I created this by mistake a second ago" case) — see stopRecurringRule
 * for the normal "I want to end this" path.
 */
export async function deleteRecurringRule(userId: string, ruleId: string) {
  await getOwnedRule(userId, ruleId);

  const occurrenceCount = await prisma.transaction.count({ where: { recurringRuleId: ruleId } });
  if (occurrenceCount > 0) {
    throw new Error(
      "Cette règle a déjà généré des transactions et ne peut pas être supprimée — utilisez plutôt « Arrêter » pour conserver l'historique.",
    );
  }

  await prisma.recurringRule.delete({ where: { id: ruleId } });
}
