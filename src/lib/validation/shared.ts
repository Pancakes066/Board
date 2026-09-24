import { z } from "zod";

/** Parses a user-typed amount ("11,12" or "11.12") into integer cents. */
export const amountToCents = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  const normalized = val.trim().replace(",", ".");
  if (normalized === "") return undefined;
  const num = Number(normalized);
  return Number.isFinite(num) ? Math.round(num * 100) : undefined;
}, z.number("Montant invalide.").int().positive("Le montant doit être supérieur à 0."));
