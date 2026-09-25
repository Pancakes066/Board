/** Pure, testable currency math — no I/O. Rates and margins come from
 * the caller (exchange-rates.ts fetches/caches the rate; the margin is
 * whatever the user configured on the project). */

/** Converts an amount in cents from one currency to another given `rate`
 * (1 unit of base = `rate` units of quote). Rounds to the nearest cent. */
export function convertCents(amountCents: number, rate: number): number {
  return Math.round(amountCents * rate);
}

/** Applies a safety margin (e.g. marginPct=10 -> ×1.10), rounded to the
 * nearest cent. A null/undefined/zero margin returns the amount unchanged. */
export function applyMargin(amountCents: number, marginPct: number | null | undefined): number {
  if (!marginPct) return amountCents;
  return Math.round(amountCents * (1 + marginPct / 100));
}

/** The "budget calculé avec marge" example from the spec: a safety margin
 * on an exchange rate makes 1 unit of base buy FEWER units of quote (a
 * cushion against the rate moving against you before you actually pay) —
 * so this divides, it does not multiply, the raw rate. */
export function applyRateMargin(rate: number, marginPct: number | null | undefined): number {
  if (!marginPct) return rate;
  return rate / (1 + marginPct / 100);
}
