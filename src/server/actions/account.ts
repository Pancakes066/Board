"use server";

import { signOut } from "@/server/auth/auth.config";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
