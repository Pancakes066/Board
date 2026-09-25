import { prisma } from "@/server/db/prisma";
import type { SavingsGoalInput, ContributionInput } from "@/lib/validation/savings-goal";

export type SavingsGoalWithProgress = {
  id: string;
  name: string;
  emoji: string | null;
  targetAmountCents: number;
  initialAmountCents: number;
  currentAmountCents: number;
  targetDate: Date | null;
  status: "ACTIVE" | "ACHIEVED" | "ARCHIVED";
  accountId: string | null;
  progressPct: number;
  /** null when there's no target date to project against. */
  suggestedMonthlyContributionCents: number | null;
};

function monthsBetween(from: Date, to: Date): number {
  const months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  return Math.max(months, 1);
}

function withProgress(
  goal: {
    id: string;
    name: string;
    emoji: string | null;
    targetAmountCents: number;
    initialAmountCents: number;
    targetDate: Date | null;
    status: "ACTIVE" | "ACHIEVED" | "ARCHIVED";
    accountId: string | null;
  },
  contributedCents: number,
  now: Date,
): SavingsGoalWithProgress {
  const currentAmountCents = goal.initialAmountCents + contributedCents;
  const remaining = goal.targetAmountCents - currentAmountCents;

  return {
    id: goal.id,
    name: goal.name,
    emoji: goal.emoji,
    targetAmountCents: goal.targetAmountCents,
    initialAmountCents: goal.initialAmountCents,
    currentAmountCents,
    targetDate: goal.targetDate,
    status: goal.status,
    accountId: goal.accountId,
    progressPct:
      goal.targetAmountCents > 0
        ? Math.round((currentAmountCents / goal.targetAmountCents) * 1000) / 10
        : 0,
    suggestedMonthlyContributionCents:
      goal.targetDate && remaining > 0
        ? Math.ceil(remaining / monthsBetween(now, goal.targetDate))
        : goal.targetDate
          ? 0
          : null,
  };
}

/** Lightweight list for a "link this rule to a goal" select — no progress math. */
export function listSavingsGoalOptions(userId: string) {
  return prisma.savingsGoal.findMany({
    where: { userId, status: "ACTIVE" },
    select: { id: true, name: true, emoji: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function listSavingsGoalsWithProgress(
  userId: string,
  now: Date,
): Promise<SavingsGoalWithProgress[]> {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const contributions = await prisma.transaction.groupBy({
    by: ["savingsGoalId"],
    where: { userId, status: "COMPLETED", savingsGoalId: { in: goals.map((g) => g.id) } },
    _sum: { amountCents: true },
  });
  const contributedByGoal = new Map(
    contributions.map((c) => [c.savingsGoalId as string, c._sum.amountCents ?? 0]),
  );

  return goals.map((goal) => withProgress(goal, contributedByGoal.get(goal.id) ?? 0, now));
}

async function getOwnedGoal(userId: string, goalId: string) {
  const goal = await prisma.savingsGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) {
    throw new Error("Objectif introuvable.");
  }
  return goal;
}

export async function createSavingsGoal(userId: string, input: SavingsGoalInput) {
  return prisma.savingsGoal.create({
    data: {
      userId,
      name: input.name,
      emoji: input.emoji,
      targetAmountCents: input.targetAmountCents,
      initialAmountCents: input.initialAmountCents ?? 0,
      accountId: input.accountId ?? null,
      targetDate: input.targetDate,
    },
  });
}

export async function updateSavingsGoal(userId: string, goalId: string, input: SavingsGoalInput) {
  await getOwnedGoal(userId, goalId);
  return prisma.savingsGoal.update({
    where: { id: goalId },
    data: {
      name: input.name,
      emoji: input.emoji,
      targetAmountCents: input.targetAmountCents,
      initialAmountCents: input.initialAmountCents ?? 0,
      accountId: input.accountId ?? null,
      targetDate: input.targetDate,
    },
  });
}

/** Unlinks (doesn't destroy) any rule/transaction pointed at this goal
 * before deleting it — a user can retire a goal without losing the
 * recurring savings rule or the transaction history that fed it. */
export async function deleteSavingsGoal(userId: string, goalId: string) {
  await getOwnedGoal(userId, goalId);
  await prisma.$transaction([
    prisma.recurringRule.updateMany({ where: { savingsGoalId: goalId }, data: { savingsGoalId: null } }),
    prisma.transaction.updateMany({ where: { savingsGoalId: goalId }, data: { savingsGoalId: null } }),
    prisma.savingsGoal.delete({ where: { id: goalId } }),
  ]);
}

async function assertValidCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || (category.userId !== null && category.userId !== userId)) {
    throw new Error("Catégorie invalide.");
  }
}

/** A manual, one-off contribution — a completed SAVINGS transaction linked
 * to the goal, no different in kind from any other manual transaction. */
export async function addContribution(userId: string, goalId: string, input: ContributionInput) {
  await getOwnedGoal(userId, goalId);
  await assertValidCategory(userId, input.categoryId);
  const period = { year: input.date.getUTCFullYear(), month: input.date.getUTCMonth() + 1 };

  return prisma.transaction.create({
    data: {
      userId,
      recurringRuleId: null,
      type: "SAVINGS",
      status: "COMPLETED",
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      savingsGoalId: goalId,
      sourceDate: input.date,
      date: input.date,
      periodYear: period.year,
      periodMonth: period.month,
      isModified: false,
    },
  });
}
