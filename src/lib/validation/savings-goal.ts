import { z } from "zod";

import { amountToCents } from "./shared";

const optionalAmountToCents = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  amountToCents.optional(),
);

export const savingsGoalSchema = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(100),
  emoji: z
    .string()
    .trim()
    .max(8)
    .optional()
    .transform((v) => (v ? v : undefined)),
  targetAmountCents: amountToCents,
  initialAmountCents: optionalAmountToCents,
  targetDate: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.date("Date invalide.").optional(),
  ),
});

export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;

export const contributionSchema = z.object({
  amountCents: amountToCents,
  categoryId: z.string().min(1, "Catégorie requise."),
  date: z.coerce.date("Date invalide."),
});

export type ContributionInput = z.infer<typeof contributionSchema>;
