import { z } from "zod";

import { amountToCents } from "./shared";

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "Catégorie requise."),
  amountCents: amountToCents,
});

export type BudgetInput = z.infer<typeof budgetSchema>;
