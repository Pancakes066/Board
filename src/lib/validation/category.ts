import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(50),
  emoji: z
    .string()
    .trim()
    .max(8)
    .optional()
    .transform((v) => (v ? v : undefined)),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide.")
    .optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
