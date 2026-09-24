import { z } from "zod";

import { amountToCents } from "./shared";

export const manualTransactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "SAVINGS"]),
  amountCents: amountToCents,
  categoryId: z.string().min(1, "Catégorie requise."),
  date: z.coerce.date("Date invalide."),
  status: z.enum(["PLANNED", "COMPLETED"]),
  notes: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().max(200).optional(),
  ),
});

export type ManualTransactionInput = z.infer<typeof manualTransactionSchema>;

/** Editing a generated occurrence: amount/date/category/notes only — its
 * type and link to the parent rule never change. */
export const occurrenceOverrideSchema = z.object({
  amountCents: amountToCents,
  categoryId: z.string().min(1, "Catégorie requise."),
  date: z.coerce.date("Date invalide."),
  notes: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().max(200).optional(),
  ),
});

export type OccurrenceOverrideInput = z.infer<typeof occurrenceOverrideSchema>;
