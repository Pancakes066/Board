"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/session";
import { savingsGoalSchema, contributionSchema } from "@/lib/validation/savings-goal";
import * as goalsService from "@/server/services/savings/goal-projection";

export type SavingsGoalActionState = { error?: string } | undefined;

function parseGoalInput(formData: FormData) {
  return savingsGoalSchema.safeParse({
    name: formData.get("name"),
    emoji: formData.get("emoji") || undefined,
    targetAmountCents: formData.get("targetAmount"),
    initialAmountCents: formData.get("initialAmount"),
    targetDate: formData.get("targetDate"),
  });
}

export async function createSavingsGoalAction(
  _prevState: SavingsGoalActionState,
  formData: FormData,
): Promise<SavingsGoalActionState> {
  const user = await requireUser();
  const parsed = parseGoalInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await goalsService.createSavingsGoal(user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/savings");
  return {};
}

export async function updateSavingsGoalAction(
  goalId: string,
  _prevState: SavingsGoalActionState,
  formData: FormData,
): Promise<SavingsGoalActionState> {
  const user = await requireUser();
  const parsed = parseGoalInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await goalsService.updateSavingsGoal(user.id, goalId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/savings");
  return {};
}

export async function deleteSavingsGoalAction(goalId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await goalsService.deleteSavingsGoal(user.id, goalId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/savings");
  return {};
}

export async function addContributionAction(
  goalId: string,
  _prevState: SavingsGoalActionState,
  formData: FormData,
): Promise<SavingsGoalActionState> {
  const user = await requireUser();
  const parsed = contributionSchema.safeParse({
    amountCents: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    date: formData.get("date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await goalsService.addContribution(user.id, goalId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/savings");
  return {};
}
