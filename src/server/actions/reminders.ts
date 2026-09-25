"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/session";
import { reminderSchema } from "@/lib/validation/reminder";
import * as remindersService from "@/server/services/reminders/reminders";

export type ReminderActionState = { error?: string } | undefined;

function parseReminderInput(formData: FormData) {
  return reminderSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    date: formData.get("date"),
    hour: formData.get("hour"),
    minute: formData.get("minute"),
    frequency: formData.get("frequency"),
    dayOfMonth: formData.get("dayOfMonth"),
    month: formData.get("month"),
    dayOfWeek: formData.get("dayOfWeek"),
    intervalDays: formData.get("intervalDays"),
    endDate: formData.get("endDate"),
    categoryId: formData.get("categoryId"),
    recurringRuleId: formData.get("recurringRuleId"),
    budgetId: formData.get("budgetId"),
    savingsGoalId: formData.get("savingsGoalId"),
    projectId: formData.get("projectId"),
  });
}

export async function createReminderAction(
  _prevState: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  const user = await requireUser();
  const parsed = parseReminderInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await remindersService.createReminder(user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/reminders");
  revalidatePath("/calendar");
  return {};
}

export async function updateReminderAction(
  reminderId: string,
  _prevState: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  const user = await requireUser();
  const parsed = parseReminderInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await remindersService.updateReminder(user.id, reminderId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/reminders");
  revalidatePath("/calendar");
  return {};
}

export async function deleteReminderAction(reminderId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await remindersService.deleteReminder(user.id, reminderId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/reminders");
  revalidatePath("/calendar");
  return {};
}

export async function setReminderStatusAction(
  reminderId: string,
  status: "ACTIVE" | "INACTIVE" | "COMPLETED",
): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await remindersService.setReminderStatus(user.id, reminderId, status);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/reminders");
  revalidatePath("/calendar");
  return {};
}

export async function listDueRemindersAction(
  sinceIso: string,
): Promise<{ id: string; title: string; occurrence: string }[]> {
  const user = await requireUser();
  const from = new Date(sinceIso);
  const now = new Date();
  const due = await remindersService.listDueReminders(user.id, from, now);
  return due.map((d) => ({ id: d.id, title: d.title, occurrence: d.occurrence.toISOString() }));
}
