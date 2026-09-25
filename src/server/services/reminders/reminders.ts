import { prisma } from "@/server/db/prisma";
import type { ReminderInput } from "@/lib/validation/reminder";
import { computeReminderOccurrenceDates } from "./occurrence-dates";

export type ReminderWithLinks = Awaited<ReturnType<typeof listReminders>>[number];

async function getOwnedReminder(userId: string, reminderId: string) {
  const reminder = await prisma.reminder.findUnique({ where: { id: reminderId } });
  if (!reminder || reminder.userId !== userId) {
    throw new Error("Rappel introuvable.");
  }
  return reminder;
}

/** Options for the "link to an existing financial item" selects in the
 * reminder form — lightweight, no computed fields. */
export async function listReminderLinkOptions(userId: string) {
  const [categories, recurringRules, budgets, savingsGoals, projects] = await Promise.all([
    prisma.category.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      select: { id: true, name: true, emoji: true },
      orderBy: { name: "asc" },
    }),
    prisma.recurringRule.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.budget.findMany({
      where: { userId },
      select: { id: true, category: { select: { name: true, emoji: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.savingsGoal.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { categories, recurringRules, budgets, savingsGoals, projects };
}

export function listReminders(userId: string) {
  return prisma.reminder.findMany({
    where: { userId },
    include: {
      category: { select: { id: true, name: true, emoji: true } },
      recurringRule: { select: { id: true, name: true } },
      budget: { select: { id: true, category: { select: { name: true, emoji: true } } } },
      savingsGoal: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  });
}

export async function createReminder(userId: string, input: ReminderInput) {
  return prisma.reminder.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      date: input.date,
      hour: input.hour,
      minute: input.minute,
      frequency: input.frequency,
      dayOfMonth: input.dayOfMonth,
      month: input.month,
      dayOfWeek: input.dayOfWeek,
      intervalDays: input.intervalDays,
      endDate: input.endDate,
      categoryId: input.categoryId,
      recurringRuleId: input.recurringRuleId,
      budgetId: input.budgetId,
      savingsGoalId: input.savingsGoalId,
      projectId: input.projectId,
    },
  });
}

export async function updateReminder(userId: string, reminderId: string, input: ReminderInput) {
  await getOwnedReminder(userId, reminderId);
  return prisma.reminder.update({
    where: { id: reminderId },
    data: {
      title: input.title,
      description: input.description,
      date: input.date,
      hour: input.hour,
      minute: input.minute,
      frequency: input.frequency,
      dayOfMonth: input.dayOfMonth,
      month: input.month,
      dayOfWeek: input.dayOfWeek,
      intervalDays: input.intervalDays,
      endDate: input.endDate,
      categoryId: input.categoryId,
      recurringRuleId: input.recurringRuleId,
      budgetId: input.budgetId,
      savingsGoalId: input.savingsGoalId,
      projectId: input.projectId,
    },
  });
}

export async function deleteReminder(userId: string, reminderId: string) {
  await getOwnedReminder(userId, reminderId);
  await prisma.reminder.delete({ where: { id: reminderId } });
}

export async function setReminderStatus(
  userId: string,
  reminderId: string,
  status: "ACTIVE" | "INACTIVE" | "COMPLETED",
) {
  await getOwnedReminder(userId, reminderId);
  return prisma.reminder.update({ where: { id: reminderId }, data: { status } });
}

/** Reminders whose next occurrence (or only occurrence, for ONCE) falls
 * within [from, now] and hasn't been "seen" yet by the caller — used by
 * the in-app/browser notifier's poll. Purely a read: never mutates status
 * or creates anything (a reminder never automatically becomes a
 * transaction). */
export async function listDueReminders(userId: string, from: Date, now: Date) {
  const reminders = await prisma.reminder.findMany({ where: { userId, status: "ACTIVE" } });
  const due: { id: string; title: string; occurrence: Date }[] = [];
  for (const reminder of reminders) {
    const occurrences = computeReminderOccurrenceDates(reminder, { from, to: now });
    if (occurrences.length > 0) {
      due.push({ id: reminder.id, title: reminder.title, occurrence: occurrences[occurrences.length - 1] });
    }
  }
  return due;
}
