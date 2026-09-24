"use server";

import { signOut } from "@/server/auth/auth.config";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { checkRateLimit } from "@/server/auth/rate-limit";
import { changePasswordSchema, deleteAccountSchema } from "@/lib/validation/account";

export type AccountActionState = { error?: string; success?: string } | undefined;

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function changePasswordAction(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  // Someone holding just the session cookie (stolen token, shared device,
  // XSS) still has to know the real password to change it — this throttles
  // brute-forcing that confirmation, same shape as the login rate limit.
  const { allowed } = checkRateLimit(`change-password:${user.id}`, {
    max: 10,
    windowMs: 5 * 60 * 1000,
  });
  if (!allowed) {
    return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const currentValid =
    dbUser.passwordHash && (await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash));
  if (!currentValid) {
    return { error: "Mot de passe actuel incorrect." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { success: "Mot de passe mis à jour." };
}

export async function deleteAccountAction(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  const parsed = deleteAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { allowed } = checkRateLimit(`delete-account:${user.id}`, {
    max: 10,
    windowMs: 5 * 60 * 1000,
  });
  if (!allowed) {
    return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const passwordValid =
    dbUser.passwordHash && (await verifyPassword(parsed.data.password, dbUser.passwordHash));
  if (!passwordValid) {
    return { error: "Mot de passe incorrect." };
  }

  // Every owned row cascades from User via onDelete: Cascade (categories,
  // recurring rules, transactions, budgets, savings goals, sessions) — one
  // delete is a full account wipe, no manual cleanup needed.
  await prisma.user.delete({ where: { id: user.id } });

  await signOut({ redirectTo: "/login" });
}
