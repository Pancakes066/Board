"use server";

import { z } from "zod";

import { requireUser } from "@/server/auth/session";
import { amountToCents } from "@/lib/validation/shared";
import { getRate } from "@/server/services/currency/exchange-rates";
import { convertCents } from "@/server/services/currency/convert";

export type ConvertActionState =
  | {
      ok: true;
      resultCents: number;
      rate: number;
      fetchedAt: string;
      stale: boolean;
      // Echoed back from the request that actually produced this result —
      // the UI must render against these, never against whatever the
      // dropdowns currently show, or the displayed rate/result can drift
      // out of sync with the labels next to them the moment the user
      // touches a dropdown again without resubmitting.
      from: string;
      to: string;
    }
  | { ok: false; error: string }
  | undefined;

const convertSchema = z.object({
  amountCents: amountToCents,
  from: z.string().trim().length(3),
  to: z.string().trim().length(3),
});

/** Powers the standalone converter tool (section 13) — a plain
 * submit-and-see form, not a live-as-you-type widget, but it reuses the
 * exact same cached/fallback getRate() every other conversion in the app
 * goes through, so it never shows a different answer than the rest of
 * Board would for the same pair. */
export async function convertCurrencyAction(
  _prevState: ConvertActionState,
  formData: FormData,
): Promise<ConvertActionState> {
  await requireUser();
  const parsed = convertSchema.safeParse({
    amountCents: formData.get("amount"),
    from: formData.get("from"),
    to: formData.get("to"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { amountCents, from, to } = parsed.data;
  const result = await getRate(from, to);
  if (!result) {
    return { ok: false, error: "Conversion indisponible pour le moment — réessayez plus tard." };
  }

  return {
    ok: true,
    resultCents: convertCents(amountCents, result.rate),
    rate: result.rate,
    fetchedAt: result.fetchedAt.toISOString(),
    stale: result.stale,
    from,
    to,
  };
}
