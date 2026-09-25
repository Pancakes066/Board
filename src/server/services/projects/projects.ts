import { prisma } from "@/server/db/prisma";
import type { ProjectInput } from "@/lib/validation/project";
import type { SavingsGoalInput } from "@/lib/validation/savings-goal";
import {
  createSavingsGoal,
  listSavingsGoalsWithProgress,
  type SavingsGoalWithProgress,
} from "@/server/services/savings/goal-projection";

export type ProjectWithProgress = Awaited<ReturnType<typeof listProjectsWithProgress>>[number];

async function getOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== userId) {
    throw new Error("Projet introuvable.");
  }
  return project;
}

function projectData(input: ProjectInput) {
  return {
    type: input.type,
    name: input.name,
    emoji: input.emoji,
    description: input.description,
    estimatedAmountCents: input.estimatedAmountCents,
    currency: input.currency,
    targetDate: input.targetDate,
    deadlineDate: input.deadlineDate,
    budgetSafetyMarginPct: input.budgetSafetyMarginPct,
    fxSafetyMarginPct: input.fxSafetyMarginPct,
    destination: input.type === "TRAVEL" ? input.destination : null,
    travelStartDate: input.type === "TRAVEL" ? input.travelStartDate : null,
    travelEndDate: input.type === "TRAVEL" ? input.travelEndDate : null,
    travelerCount: input.type === "TRAVEL" ? input.travelerCount : null,
    notes: input.notes,
  };
}

export function createProject(userId: string, input: ProjectInput) {
  return prisma.project.create({ data: { userId, ...projectData(input) } });
}

export async function updateProject(userId: string, projectId: string, input: ProjectInput) {
  await getOwnedProject(userId, projectId);
  return prisma.project.update({ where: { id: projectId }, data: projectData(input) });
}

/** Cascades to its ProjectExpense rows and, through those, the Transactions
 * they generated (see schema) — a linked SavingsGoal is left untouched,
 * the user may still want to keep saving toward it independently. */
export async function deleteProject(userId: string, projectId: string) {
  await getOwnedProject(userId, projectId);
  await prisma.project.delete({ where: { id: projectId } });
}

export async function linkSavingsGoal(userId: string, projectId: string, goalId: string) {
  await getOwnedProject(userId, projectId);
  const goal = await prisma.savingsGoal.findUnique({ where: { id: goalId } });
  if (!goal || goal.userId !== userId) {
    throw new Error("Objectif introuvable.");
  }
  return prisma.project.update({ where: { id: projectId }, data: { savingsGoalId: goalId } });
}

export async function createAndLinkSavingsGoal(
  userId: string,
  projectId: string,
  input: SavingsGoalInput,
) {
  await getOwnedProject(userId, projectId);
  const goal = await createSavingsGoal(userId, input);
  await prisma.project.update({ where: { id: projectId }, data: { savingsGoalId: goal.id } });
  return goal;
}

async function expenseTotals(projectId: string) {
  const expenses = await prisma.projectExpense.findMany({ where: { projectId } });
  let totalCents = 0;
  let paidCents = 0;
  for (const e of expenses) {
    const homeCents = e.currency === "EUR" ? e.amountCents : (e.convertedAmountCents ?? 0);
    totalCents += homeCents;
    if (e.status === "COMPLETED") paidCents += homeCents;
  }
  return { totalCents, paidCents };
}

export async function listProjectsWithProgress(userId: string, now: Date) {
  const [projects, goals] = await Promise.all([
    prisma.project.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    listSavingsGoalsWithProgress(userId, now),
  ]);
  const goalsById = new Map<string, SavingsGoalWithProgress>(goals.map((g) => [g.id, g]));

  return Promise.all(
    projects.map(async (project) => ({
      ...project,
      savingsGoal: project.savingsGoalId ? (goalsById.get(project.savingsGoalId) ?? null) : null,
      ...(await expenseTotals(project.id)),
    })),
  );
}

export async function getProjectWithProgress(userId: string, projectId: string, now: Date) {
  const project = await getOwnedProject(userId, projectId);
  const [goals, totals, expenses] = await Promise.all([
    project.savingsGoalId ? listSavingsGoalsWithProgress(userId, now) : Promise.resolve([]),
    expenseTotals(project.id),
    prisma.projectExpense.findMany({
      where: { projectId: project.id },
      include: { transaction: true },
      orderBy: [{ plannedDate: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  const savingsGoal = project.savingsGoalId
    ? (goals.find((g) => g.id === project.savingsGoalId) ?? null)
    : null;

  return { ...project, savingsGoal, ...totals, expenses };
}
