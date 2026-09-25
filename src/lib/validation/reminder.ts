import { z } from "zod";

const optionalIntInRange = (min: number, max: number) =>
  z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const num = Number(val);
    return Number.isFinite(num) ? num : val;
  }, z.number().int().min(min).max(max).optional());

const optionalLinkId = z.preprocess(
  (v) => (v === "" || v === "__none__" || v === null || v === undefined ? undefined : v),
  z.string().optional(),
);

export const reminderSchema = z
  .object({
    title: z.string().trim().min(1, "Titre requis.").max(150),
    description: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().trim().max(1000).optional(),
    ),
    date: z.coerce.date("Date invalide."),
    hour: optionalIntInRange(0, 23).default(9),
    minute: optionalIntInRange(0, 59).default(0),
    frequency: z.enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"]),
    dayOfMonth: optionalIntInRange(1, 31),
    month: optionalIntInRange(1, 12),
    dayOfWeek: optionalIntInRange(0, 6),
    intervalDays: optionalIntInRange(1, 3650),
    // v is `null` (not "") whenever the endDate field is absent from the
    // DOM entirely — it's conditionally rendered (hidden for ONCE) — so
    // both must be treated as "absent," or z.coerce.date(null) silently
    // coerces to the Unix epoch instead of staying undefined.
    endDate: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.coerce.date("Date de fin invalide.").optional(),
    ),
    categoryId: optionalLinkId,
    recurringRuleId: optionalLinkId,
    budgetId: optionalLinkId,
    savingsGoalId: optionalLinkId,
    projectId: optionalLinkId,
  })
  .superRefine((data, ctx) => {
    if ((data.frequency === "MONTHLY" || data.frequency === "YEARLY") && !data.dayOfMonth) {
      ctx.addIssue({ code: "custom", path: ["dayOfMonth"], message: "Jour du mois requis." });
    }
    if (data.frequency === "YEARLY" && !data.month) {
      ctx.addIssue({ code: "custom", path: ["month"], message: "Mois requis." });
    }
    if (data.frequency === "WEEKLY" && data.dayOfWeek === undefined) {
      ctx.addIssue({ code: "custom", path: ["dayOfWeek"], message: "Jour de la semaine requis." });
    }
    if (data.frequency === "CUSTOM" && !data.intervalDays) {
      ctx.addIssue({ code: "custom", path: ["intervalDays"], message: "Intervalle (en jours) requis." });
    }
    if (data.endDate && data.endDate < data.date) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "La date de fin doit être après la date de début.",
      });
    }
  });

export type ReminderInput = z.infer<typeof reminderSchema>;
