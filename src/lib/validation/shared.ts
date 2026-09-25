import { z } from "zod";

function parseAmount(val: unknown): unknown {
  if (typeof val !== "string") return val;
  const normalized = val.trim().replace(",", ".");
  if (normalized === "") return undefined;
  const num = Number(normalized);
  return Number.isFinite(num) ? Math.round(num * 100) : undefined;
}

/** Parses a user-typed amount ("11,12" or "11.12") into integer cents. */
export const amountToCents = z.preprocess(
  parseAmount,
  z.number("Montant invalide.").int().positive("Le montant doit être supérieur à 0."),
);

/** Same, but allows 0 — for amounts that start from nothing (e.g. "already
 * saved" on a brand-new savings goal), where 0 is a legitimate value, not
 * an error. */
export const amountToCentsAllowZero = z.preprocess(
  parseAmount,
  z.number("Montant invalide.").int().nonnegative("Le montant ne peut pas être négatif."),
);
