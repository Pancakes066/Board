import { z } from "zod";

import { amountToCents } from "./shared";
import { DEFAULT_CURRENCY } from "@/lib/constants/currencies";

const optionalDate = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.date("Date invalide.").optional(),
);

const optionalPct = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const num = Number(v);
  return Number.isFinite(num) ? num : v;
}, z.number().int().min(0).max(100).optional());

const optionalInt = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const num = Number(v);
  return Number.isFinite(num) ? num : v;
}, z.number().int().positive().optional());

export const projectSchema = z
  .object({
    type: z.enum(["TRAVEL", "PURCHASE", "EVENT", "MOVING", "OTHER"]),
    name: z.string().trim().min(1, "Nom requis.").max(100),
    emoji: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(8).optional()),
    description: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().trim().max(2000).optional(),
    ),
    estimatedAmountCents: amountToCents,
    currency: z.string().trim().length(3).default(DEFAULT_CURRENCY),
    targetDate: optionalDate,
    deadlineDate: optionalDate,
    budgetSafetyMarginPct: optionalPct,
    fxSafetyMarginPct: optionalPct,
    // Travel mode — required only when type = TRAVEL (see superRefine).
    destination: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().trim().max(100).optional(),
    ),
    travelStartDate: optionalDate,
    travelEndDate: optionalDate,
    travelerCount: optionalInt,
    notes: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(2000).optional()),
  })
  .superRefine((data, ctx) => {
    if (data.type === "TRAVEL") {
      if (!data.destination) {
        ctx.addIssue({ code: "custom", path: ["destination"], message: "Destination requise." });
      }
      if (!data.travelStartDate) {
        ctx.addIssue({
          code: "custom",
          path: ["travelStartDate"],
          message: "Date de départ requise.",
        });
      }
      if (!data.travelEndDate) {
        ctx.addIssue({ code: "custom", path: ["travelEndDate"], message: "Date de retour requise." });
      }
    }
    if (data.travelStartDate && data.travelEndDate && data.travelEndDate < data.travelStartDate) {
      ctx.addIssue({
        code: "custom",
        path: ["travelEndDate"],
        message: "La date de retour doit être après la date de départ.",
      });
    }
  });

export type ProjectInput = z.infer<typeof projectSchema>;
