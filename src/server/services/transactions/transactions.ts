import { prisma } from "@/server/db/prisma";
import type { Period } from "@/lib/utils/date";
import { periodOf } from "@/lib/utils/date";
import type { ManualTransactionInput, OccurrenceOverrideInput } from "@/lib/validation/transaction";

export function listTransactionsForPeriod(userId: string, period: Period) {
  return prisma.transaction.findMany({
    where: { userId, periodYear: period.year, periodMonth: period.month },
    include: { category: true, recurringRule: true },
    orderBy: [{ date: "asc" }],
  });
}

async function assertValidCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || (category.userId !== null && category.userId !== userId)) {
    throw new Error("Catégorie invalide.");
  }
}

export async function createManualTransaction(userId: string, input: ManualTransactionInput) {
  await assertValidCategory(userId, input.categoryId);
  const period = periodOf(input.date);

  return prisma.transaction.create({
    data: {
      userId,
      recurringRuleId: null,
      type: input.type,
      status: input.status,
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      sourceDate: input.date,
      date: input.date,
      periodYear: period.year,
      periodMonth: period.month,
      isModified: false,
      notes: input.notes,
    },
  });
}

async function getOwnedTransaction(userId: string, transactionId: string) {
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction || transaction.userId !== userId) {
    throw new Error("Transaction introuvable.");
  }
  return transaction;
}

export async function updateManualTransaction(
  userId: string,
  transactionId: string,
  input: ManualTransactionInput,
) {
  const transaction = await getOwnedTransaction(userId, transactionId);
  if (transaction.recurringRuleId !== null) {
    throw new Error("Cette transaction provient d'une règle récurrente.");
  }
  await assertValidCategory(userId, input.categoryId);
  const period = periodOf(input.date);

  return prisma.transaction.update({
    where: { id: transactionId },
    data: {
      type: input.type,
      status: input.status,
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      sourceDate: input.date,
      date: input.date,
      periodYear: period.year,
      periodMonth: period.month,
      notes: input.notes,
    },
  });
}

export async function deleteManualTransaction(userId: string, transactionId: string) {
  const transaction = await getOwnedTransaction(userId, transactionId);
  if (transaction.recurringRuleId !== null) {
    throw new Error("Cette transaction provient d'une règle récurrente — utilisez plutôt « Ignorer ».");
  }
  await prisma.transaction.delete({ where: { id: transactionId } });
}

/** Overrides a single generated occurrence without touching its parent rule. */
export async function updateOccurrence(
  userId: string,
  transactionId: string,
  input: OccurrenceOverrideInput,
) {
  const transaction = await getOwnedTransaction(userId, transactionId);
  if (transaction.recurringRuleId === null) {
    throw new Error("Cette transaction est manuelle.");
  }
  await assertValidCategory(userId, input.categoryId);

  // The occurrence's period bucket is intentionally NOT recomputed from the
  // new date — periodYear/periodMonth stay derived from sourceDate (the
  // rule-computed date), which never changes here. Nudging an occurrence's
  // displayed date across a month boundary must not evict it from the
  // month it was generated/forecast for.
  return prisma.transaction.update({
    where: { id: transactionId },
    data: {
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      date: input.date,
      notes: input.notes,
      isModified: true,
    },
  });
}

export async function setTransactionStatus(
  userId: string,
  transactionId: string,
  status: "PLANNED" | "COMPLETED",
) {
  await getOwnedTransaction(userId, transactionId);
  return prisma.transaction.update({ where: { id: transactionId }, data: { status } });
}

/** Skip is only meaningful for a generated occurrence — a status, not a
 * delete, so regeneration never resurrects it (the unique row still
 * occupies its (recurringRuleId, sourceDate) slot). */
export async function skipOccurrence(userId: string, transactionId: string) {
  const transaction = await getOwnedTransaction(userId, transactionId);
  if (transaction.recurringRuleId === null) {
    throw new Error("Cette transaction est manuelle — supprimez-la plutôt.");
  }
  return prisma.transaction.update({ where: { id: transactionId }, data: { status: "SKIPPED" } });
}

export async function unskipOccurrence(userId: string, transactionId: string) {
  await getOwnedTransaction(userId, transactionId);
  return prisma.transaction.update({ where: { id: transactionId }, data: { status: "PLANNED" } });
}
