import { z } from "zod";

import { amountToCents } from "./shared";

const optionalIntInRange = (min: number, max: number) =>
  z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const num = Number(val);
    return Number.isFinite(num) ? num : val;
  }, z.number().int().min(min).max(max).optional());

export const recurringRuleSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE", "SAVINGS"]),
    name: z.string().trim().min(1, "Nom requis.").max(100),
    amountCents: amountToCents,
    frequency: z.enum(["MONTHLY", "WEEKLY", "YEARLY"]),
    dayOfMonth: optionalIntInRange(1, 31),
    month: optionalIntInRange(1, 12),
    dayOfWeek: optionalIntInRange(0, 6),
    categoryId: z.string().min(1, "Catégorie requise."),
    startDate: z.coerce.date("Date de début invalide."),
    endDate: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.coerce.date("Date de fin invalide.").optional(),
    ),
    isSubscription: z
      .union([z.literal("on"), z.literal(null), z.undefined()])
      .transform((v) => v === "on"),
  })
  .superRefine((data, ctx) => {
    if ((data.frequency === "MONTHLY" || data.frequency === "YEARLY") && !data.dayOfMonth) {
      ctx.addIssue({
        code: "custom",
        path: ["dayOfMonth"],
        message: "Jour du mois requis.",
      });
    }
    if (data.frequency === "YEARLY" && !data.month) {
      ctx.addIssue({ code: "custom", path: ["month"], message: "Mois requis." });
    }
    if (data.frequency === "WEEKLY" && data.dayOfWeek === undefined) {
      ctx.addIssue({ code: "custom", path: ["dayOfWeek"], message: "Jour de la semaine requis." });
    }
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "La date de fin doit être après la date de début.",
      });
    }
  });

export type RecurringRuleInput = z.infer<typeof recurringRuleSchema>;
