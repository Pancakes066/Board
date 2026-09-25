import { z } from "zod";

import { amountToCents } from "./shared";
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies";

export const projectExpenseSchema = z.object({
  label: z.string().trim().min(1, "Nom requis.").max(100),
  emoji: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(8).optional()),
  amountCents: amountToCents,
  currency: z.string().trim().length(3).default(DEFAULT_CURRENCY),
  plannedDate: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.date("Date invalide.").optional(),
  ),
  note: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(500).optional()),
});

export type ProjectExpenseInput = z.infer<typeof projectExpenseSchema>;
