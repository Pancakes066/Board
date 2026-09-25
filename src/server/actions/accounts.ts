"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth/session";
import { financialAccountSchema, accountTransferSchema } from "@/lib/validation/financial-account";
import * as accountsService from "@/server/services/accounts/accounts";
import * as transfersService from "@/server/services/accounts/transfers";

export type AccountActionState = { error?: string } | undefined;

function parseAccountInput(formData: FormData) {
  return financialAccountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    currency: formData.get("currency") || "EUR",
    startingBalanceCents: formData.get("startingBalance"),
    description: formData.get("description") || undefined,
    isActive: formData.get("isActive") !== "false",
  });
}

export async function createAccountAction(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  const parsed = parseAccountInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await accountsService.createAccount(user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return {};
}

export async function updateAccountAction(
  accountId: string,
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  const parsed = parseAccountInput(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await accountsService.updateAccount(user.id, accountId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteAccountAction(accountId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await accountsService.deleteAccount(user.id, accountId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return {};
}

export async function createTransferAction(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  const parsed = accountTransferSchema.safeParse({
    fromAccountId: formData.get("fromAccountId"),
    toAccountId: formData.get("toAccountId"),
    amountCents: formData.get("amount"),
    date: formData.get("date"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    await transfersService.createTransfer(user.id, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteTransferAction(transferId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await transfersService.deleteTransfer(user.id, transferId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erreur inconnue." };
  }
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return {};
}
