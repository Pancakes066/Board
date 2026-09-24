"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/session";
import { budgetSchema } from "@/lib/validation/budget";
import * as budgetsService from "@/server/services/budgets/budget-progress";

export type BudgetActionState = { error?: string } | undefined;

export async function setBudgetAction(
  _prevState: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const user = await requireUser();
  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amountCents: formData.get("amount"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await budgetsService.setBudget(user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/budgets");
  return {};
}

export async function deleteBudgetAction(budgetId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await budgetsService.deleteBudget(user.id, budgetId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/budgets");
  return {};
}
