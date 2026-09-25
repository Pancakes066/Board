"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/session";
import { projectSchema } from "@/lib/validation/project";
import { savingsGoalSchema } from "@/lib/validation/savings-goal";
import * as projectsService from "@/server/services/projects/projects";

export type ProjectActionState = { error?: string } | undefined;

function parseProjectInput(formData: FormData) {
  return projectSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    emoji: formData.get("emoji") || undefined,
    description: formData.get("description") || undefined,
    estimatedAmountCents: formData.get("estimatedAmount"),
    currency: formData.get("currency") || undefined,
    targetDate: formData.get("targetDate"),
    deadlineDate: formData.get("deadlineDate"),
    budgetSafetyMarginPct: formData.get("budgetSafetyMarginPct"),
    fxSafetyMarginPct: formData.get("fxSafetyMarginPct"),
    destination: formData.get("destination") || undefined,
    travelStartDate: formData.get("travelStartDate"),
    travelEndDate: formData.get("travelEndDate"),
    travelerCount: formData.get("travelerCount"),
    notes: formData.get("notes") || undefined,
  });
}

export async function createProjectAction(
  _prevState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const user = await requireUser();
  const parsed = parseProjectInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await projectsService.createProject(user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/projects");
  return {};
}

export async function updateProjectAction(
  projectId: string,
  _prevState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const user = await requireUser();
  const parsed = parseProjectInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await projectsService.updateProject(user.id, projectId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function deleteProjectAction(projectId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await projectsService.deleteProject(user.id, projectId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/projects");
  return {};
}

export async function linkSavingsGoalAction(
  projectId: string,
  goalId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await projectsService.linkSavingsGoal(user.id, projectId, goalId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function createAndLinkSavingsGoalAction(
  projectId: string,
  _prevState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const user = await requireUser();
  const parsed = savingsGoalSchema.safeParse({
    name: formData.get("name"),
    emoji: formData.get("emoji") || undefined,
    targetAmountCents: formData.get("targetAmount"),
    initialAmountCents: formData.get("initialAmount"),
    targetDate: formData.get("targetDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await projectsService.createAndLinkSavingsGoal(user.id, projectId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath(`/projects/${projectId}`);
  return {};
}
