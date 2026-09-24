import type { Plan } from "@prisma/client";

export const FEATURES = {
  ADVANCED_FORECAST: "advancedForecast",
  ADVANCED_SAVINGS_GOALS: "advancedSavingsGoals",
  AUTOMATIC_INSIGHTS: "automaticInsights",
  CSV_IMPORT: "csvImport",
  AUTO_CATEGORIZATION: "autoCategorization",
  MULTIPLE_ACCOUNTS: "multipleAccounts",
  UNLIMITED_HISTORY: "unlimitedHistory",
  ADVANCED_STATS: "advancedStats",
  DASHBOARD_CUSTOMIZATION: "dashboardCustomization",
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

const PLAN_FEATURES: Record<Plan, ReadonlySet<Feature>> = {
  FREE: new Set([]),
  PREMIUM: new Set(Object.values(FEATURES)),
};

/** Pure — no session lookup, so this is trivially unit-testable and safe
 * to call from anywhere that already has a plan value in hand. */
export function hasFeature(plan: Plan, feature: Feature): boolean {
  return PLAN_FEATURES[plan].has(feature);
}

/** FREE-tier numeric limits, kept alongside the boolean feature map so a
 * future "soft cap" (e.g. number of savings goals) has one obvious home. */
export const FREE_LIMITS = {
  /** How many months back a FREE user can view Transactions/Statistics for. */
  historyMonths: 3,
} as const;
