"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/session";
import { manualTransactionSchema, occurrenceOverrideSchema } from "@/lib/validation/transaction";
import * as transactionsService from "@/server/services/transactions/transactions";
import { generateOccurrencesForPeriod } from "@/server/services/recurrence/generate-month";
import type { Period } from "@/lib/utils/date";

export type TransactionActionState = { error?: string } | undefined;

function parseManualInput(formData: FormData) {
  return manualTransactionSchema.safeParse({
    type: formData.get("type"),
    amountCents: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    accountId: formData.get("accountId"),
    date: formData.get("date"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });
}

export async function createManualTransactionAction(
  _prevState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const user = await requireUser();
  const parsed = parseManualInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await transactionsService.createManualTransaction(user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/transactions");
  return {};
}

export async function updateManualTransactionAction(
  transactionId: string,
  _prevState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const user = await requireUser();
  const parsed = parseManualInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await transactionsService.updateManualTransaction(user.id, transactionId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/transactions");
  return {};
}

export async function updateOccurrenceAction(
  transactionId: string,
  _prevState: TransactionActionState,
  formData: FormData,
): Promise<TransactionActionState> {
  const user = await requireUser();
  const parsed = occurrenceOverrideSchema.safeParse({
    amountCents: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    accountId: formData.get("accountId"),
    date: formData.get("date"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await transactionsService.updateOccurrence(user.id, transactionId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/transactions");
  return {};
}

export async function deleteManualTransactionAction(
  transactionId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await transactionsService.deleteManualTransaction(user.id, transactionId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/transactions");
  return {};
}

export async function setTransactionStatusAction(
  transactionId: string,
  status: "PLANNED" | "COMPLETED",
): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await transactionsService.setTransactionStatus(user.id, transactionId, status);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/transactions");
  return {};
}

export async function skipOccurrenceAction(transactionId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await transactionsService.skipOccurrence(user.id, transactionId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/transactions");
  return {};
}

export async function unskipOccurrenceAction(transactionId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await transactionsService.unskipOccurrence(user.id, transactionId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/transactions");
  return {};
}

export async function generateMonthAction(period: Period): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await generateOccurrencesForPeriod(user.id, period);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/transactions");
  return {};
}
