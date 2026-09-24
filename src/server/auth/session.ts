import { redirect } from "next/navigation";

import { auth } from "./auth.config";

/** Returns the current session's user, or null when signed out. */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Same as `getCurrentUser`, but redirects to /login instead of returning
 * null. Use at the top of any Server Action or Server Component that
 * requires a signed-in user (the (app) layout already guards rendering via
 * proxy.ts, but Server Actions are invoked directly and need their own
 * check).
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
