"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/session";
import { recurringRuleSchema } from "@/lib/validation/recurring-rule";
import * as recurringRulesService from "@/server/services/recurring-rules/recurring-rules";
import { generateRollingWindow, onRecurringRuleUpdated } from "@/server/services/recurrence/sync-forward";

export type RecurringRuleActionState = { error?: string } | undefined;

function parseInput(formData: FormData) {
  return recurringRuleSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    amountCents: formData.get("amount"),
    frequency: formData.get("frequency"),
    dayOfMonth: formData.get("dayOfMonth"),
    month: formData.get("month"),
    dayOfWeek: formData.get("dayOfWeek"),
    categoryId: formData.get("categoryId"),
    savingsGoalId: formData.get("savingsGoalId"),
    accountId: formData.get("accountId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    isSubscription: formData.get("isSubscription"),
  });
}

export async function createRecurringRuleAction(
  _prevState: RecurringRuleActionState,
  formData: FormData,
): Promise<RecurringRuleActionState> {
  const user = await requireUser();
  const parsed = parseInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await recurringRulesService.createRecurringRule(user.id, parsed.data);
    // So the new rule's occurrence shows up immediately, without waiting
    // for the next dashboard visit to trigger generation.
    await generateRollingWindow(user.id, new Date());
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/transactions/recurring");
  return {};
}

export async function updateRecurringRuleAction(
  ruleId: string,
  _prevState: RecurringRuleActionState,
  formData: FormData,
): Promise<RecurringRuleActionState> {
  const user = await requireUser();
  const parsed = parseInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await recurringRulesService.updateRecurringRule(user.id, ruleId, parsed.data);
    await onRecurringRuleUpdated(user.id, ruleId, new Date());
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/transactions/recurring");
  return {};
}

export async function stopRecurringRuleAction(ruleId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await recurringRulesService.stopRecurringRule(user.id, ruleId);
    // Removes any already-generated future occurrence that's no longer
    // covered by the rule's (now shortened) range — e.g. next month's rent
    // if the lease was stopped today.
    await onRecurringRuleUpdated(user.id, ruleId, new Date());
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/transactions/recurring");
  return {};
}

export async function reactivateRecurringRuleAction(ruleId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await recurringRulesService.reactivateRecurringRule(user.id, ruleId);
    await onRecurringRuleUpdated(user.id, ruleId, new Date());
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/transactions/recurring");
  return {};
}

export async function deleteRecurringRuleAction(ruleId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await recurringRulesService.deleteRecurringRule(user.id, ruleId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/transactions/recurring");
  return {};
}
