import { z } from "zod";

import { amountToCentsAllowZero } from "./shared";

const optionalAmountToCentsAllowZero = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  amountToCentsAllowZero.optional(),
);

export const financialAccountSchema = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(100),
  type: z.enum(["CHECKING", "SAVINGS_BOOK", "CARD", "CASH", "OTHER"], "Type invalide."),
  currency: z.string().trim().min(3).max(3).default("EUR"),
  startingBalanceCents: optionalAmountToCentsAllowZero,
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
  isActive: z.boolean().default(true),
});

export type FinancialAccountInput = z.infer<typeof financialAccountSchema>;

export const accountTransferSchema = z
  .object({
    fromAccountId: z.string().min(1, "Compte source requis."),
    toAccountId: z.string().min(1, "Compte destination requis."),
    amountCents: amountToCentsAllowZero.refine((v) => v > 0, "Le montant doit être supérieur à 0."),
    date: z.coerce.date("Date invalide."),
    note: z
      .string()
      .trim()
      .max(300)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    message: "Les comptes source et destination doivent être différents.",
    path: ["toAccountId"],
  });

export type AccountTransferInput = z.infer<typeof accountTransferSchema>;
