"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/session";
import { categorySchema } from "@/lib/validation/category";
import * as categoriesService from "@/server/services/categories/categories";

export type CategoryActionState = { error?: string } | undefined;

function parseInput(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get("name"),
    emoji: formData.get("emoji") || undefined,
    color: formData.get("color") || undefined,
  });
}

export async function createCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const user = await requireUser();
  const parsed = parseInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await categoriesService.createCategory(user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/settings/categories");
  return {};
}

export async function updateCategoryAction(
  categoryId: string,
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const user = await requireUser();
  const parsed = parseInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await categoriesService.updateCategory(user.id, categoryId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/settings/categories");
  return {};
}

export async function deleteCategoryAction(categoryId: string): Promise<{ error?: string }> {
  const user = await requireUser();

  try {
    await categoriesService.deleteCategory(user.id, categoryId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/settings/categories");
  return {};
}
