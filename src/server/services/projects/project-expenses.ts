import { prisma } from "@/server/db/prisma";
import { periodOf } from "@/lib/utils/date";
import type { ProjectExpenseInput } from "@/lib/validation/project-expense";
import { getRate } from "@/server/services/currency/exchange-rates";
import { convertCents } from "@/server/services/currency/convert";

async function getOwnedProjectExpense(userId: string, expenseId: string) {
  const expense = await prisma.projectExpense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.userId !== userId) {
    throw new Error("Dépense de projet introuvable.");
  }
  return expense;
}

async function getOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== userId) {
    throw new Error("Projet introuvable.");
  }
  return project;
}

/** Converts to EUR (home currency) and snapshots the rate/date used — never
 * recomputed later, so "taux utilisé" stays an honest historical fact. */
async function convertToHome(amountCents: number, currency: string) {
  if (currency === "EUR") return { convertedAmountCents: amountCents, exchangeRate: 1, convertedAt: new Date() };
  const result = await getRate(currency, "EUR");
  if (!result) return { convertedAmountCents: null, exchangeRate: null, convertedAt: null };
  return {
    convertedAmountCents: convertCents(amountCents, result.rate),
    exchangeRate: result.rate,
    convertedAt: result.fetchedAt,
  };
}

export async function createProjectExpense(
  userId: string,
  projectId: string,
  input: ProjectExpenseInput,
) {
  await getOwnedProject(userId, projectId);
  const converted = await convertToHome(input.amountCents, input.currency);

  return prisma.projectExpense.create({
    data: {
      projectId,
      userId,
      label: input.label,
      emoji: input.emoji,
      amountCents: input.amountCents,
      currency: input.currency,
      plannedDate: input.plannedDate,
      note: input.note,
      ...converted,
    },
  });
}

export async function updateProjectExpense(
  userId: string,
  expenseId: string,
  input: ProjectExpenseInput,
) {
  await getOwnedProjectExpense(userId, expenseId);
  const converted = await convertToHome(input.amountCents, input.currency);

  return prisma.projectExpense.update({
    where: { id: expenseId },
    data: {
      label: input.label,
      emoji: input.emoji,
      amountCents: input.amountCents,
      currency: input.currency,
      plannedDate: input.plannedDate,
      note: input.note,
      ...converted,
    },
  });
}

/** Deleting a line cascades to any Transaction it reserved/paid (see schema). */
export async function deleteProjectExpense(userId: string, expenseId: string) {
  await getOwnedProjectExpense(userId, expenseId);
  await prisma.projectExpense.delete({ where: { id: expenseId } });
}

async function defaultCategoryId(projectType: string): Promise<string> {
  const preferredName = projectType === "TRAVEL" ? "Voyages" : "Autre";
  const category =
    (await prisma.category.findFirst({ where: { userId: null, name: preferredName } })) ??
    (await prisma.category.findFirst({ where: { userId: null, name: "Autre" } }));
  if (!category) throw new Error("Aucune catégorie par défaut disponible.");
  return category.id;
}

function homeCents(expense: { currency: string; amountCents: number; convertedAmountCents: number | null }) {
  return expense.currency === "EUR" ? expense.amountCents : (expense.convertedAmountCents ?? 0);
}

/**
 * Reserves or pays a budget line: creates (first call) or updates (later
 * calls) the ONE linked Transaction, never more than one, via
 * ProjectExpense.transactionId's implicit unique relation. This is the
 * section-14/18 distinction from the spec — "dépense estimée" (the
 * ProjectExpense row itself) vs "transaction prévue" (status PLANNED) vs
 * "transaction effectuée" (status COMPLETED) — expressed with the exact
 * same Transaction model and status enum the rest of the app already uses.
 */
async function upsertLinkedTransaction(
  userId: string,
  expenseId: string,
  status: "PLANNED" | "COMPLETED",
) {
  const expense = await getOwnedProjectExpense(userId, expenseId);
  const existing = await prisma.transaction.findUnique({ where: { projectExpenseId: expenseId } });
  const date = expense.plannedDate ?? new Date();
  const period = periodOf(date);
  const amountCents = homeCents(expense);

  if (existing) {
    await prisma.transaction.update({ where: { id: existing.id }, data: { status, amountCents } });
  } else {
    const categoryId = await defaultCategoryId(
      (await prisma.project.findUniqueOrThrow({ where: { id: expense.projectId } })).type,
    );
    await prisma.transaction.create({
      data: {
        userId,
        type: "EXPENSE",
        status,
        amountCents,
        categoryId,
        projectExpenseId: expenseId,
        sourceDate: date,
        date,
        periodYear: period.year,
        periodMonth: period.month,
        notes: `Projet : ${expense.label}`,
      },
    });
  }

  return prisma.projectExpense.update({
    where: { id: expenseId },
    data: { status: status === "COMPLETED" ? "COMPLETED" : "PLANNED" },
  });
}

export function reserveExpense(userId: string, expenseId: string) {
  return upsertLinkedTransaction(userId, expenseId, "PLANNED");
}

export function markExpensePaid(userId: string, expenseId: string) {
  return upsertLinkedTransaction(userId, expenseId, "COMPLETED");
}

/** Removes the linked Transaction (if any) and resets the line back to
 * PLANNED-with-no-transaction — the "I reserved this by mistake" undo. */
export async function unreserveExpense(userId: string, expenseId: string) {
  await getOwnedProjectExpense(userId, expenseId);
  await prisma.transaction.deleteMany({ where: { projectExpenseId: expenseId } });
  return prisma.projectExpense.update({ where: { id: expenseId }, data: { status: "PLANNED" } });
}
