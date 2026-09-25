"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/session";
import { projectExpenseSchema } from "@/lib/validation/project-expense";
import * as expensesService from "@/server/services/projects/project-expenses";

export type ProjectExpenseActionState = { error?: string } | undefined;

function parseExpenseInput(formData: FormData) {
  return projectExpenseSchema.safeParse({
    label: formData.get("label"),
    emoji: formData.get("emoji") || undefined,
    amountCents: formData.get("amount"),
    currency: formData.get("currency") || undefined,
    plannedDate: formData.get("plannedDate"),
    note: formData.get("note") || undefined,
  });
}

export async function createProjectExpenseAction(
  projectId: string,
  _prevState: ProjectExpenseActionState,
  formData: FormData,
): Promise<ProjectExpenseActionState> {
  const user = await requireUser();
  const parsed = parseExpenseInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await expensesService.createProjectExpense(user.id, projectId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function updateProjectExpenseAction(
  projectId: string,
  expenseId: string,
  _prevState: ProjectExpenseActionState,
  formData: FormData,
): Promise<ProjectExpenseActionState> {
  const user = await requireUser();
  const parsed = parseExpenseInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await expensesService.updateProjectExpense(user.id, expenseId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function deleteProjectExpenseAction(
  projectId: string,
  expenseId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await expensesService.deleteProjectExpense(user.id, expenseId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function reserveExpenseAction(
  projectId: string,
  expenseId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await expensesService.reserveExpense(user.id, expenseId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return {};
}

export async function markExpensePaidAction(
  projectId: string,
  expenseId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await expensesService.markExpensePaid(user.id, expenseId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return {};
}

export async function unreserveExpenseAction(
  projectId: string,
  expenseId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await expensesService.unreserveExpense(user.id, expenseId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return {};
}
