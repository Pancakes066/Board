import { getCurrentUser } from "@/server/auth/session";
import { hasFeature, type Feature } from "./plans";

export class EntitlementError extends Error {
  constructor(public feature: Feature) {
    super(`Cette fonctionnalité nécessite la formule Premium.`);
    this.name = "EntitlementError";
  }
}

/** Throws EntitlementError (the UI catches it and renders an upsell) if
 * the current user's plan doesn't include `feature`. */
export async function requireFeature(feature: Feature): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !hasFeature(user.plan, feature)) {
    throw new EntitlementError(feature);
  }
}

export async function canUse(feature: Feature): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? hasFeature(user.plan, feature) : false;
}
