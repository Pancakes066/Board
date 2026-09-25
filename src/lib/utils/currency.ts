const formatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

/** Formats an integer cents amount as "1 234,56 €". */
export function formatCurrency(cents: number): string {
  return formatter.format(cents / 100);
}

/** Same, but keeps a leading sign: "+1 700,00 €" / "-820,00 €". */
export function formatSignedCurrency(cents: number): string {
  const formatted = formatCurrency(Math.abs(cents));
  return cents < 0 ? `-${formatted}` : `+${formatted}`;
}

const foreignFormatters = new Map<string, Intl.NumberFormat>();

/** Same as `formatCurrency`, but for an arbitrary ISO currency code — used
 * for ProjectExpense amounts in their own (possibly foreign) currency.
 * Intl.NumberFormat already knows each currency's own decimal places (e.g.
 * 0 for JPY), so no per-currency formatting rules are needed here. */
export function formatCurrencyIn(cents: number, currencyCode: string): string {
  let formatter = foreignFormatters.get(currencyCode);
  if (!formatter) {
    formatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: currencyCode });
    foreignFormatters.set(currencyCode, formatter);
  }
  return formatter.format(cents / 100);
}

/** Compact axis-tick label: "1,7k€" above 1000€, "45€" below — shared so
 * every chart's Y-axis converts cents the same way (a chart-local copy of
 * this once got the cents->euros->k division wrong by a factor of 100). */
export function formatCompactCurrency(cents: number): string {
  const euros = cents / 100;
  if (Math.abs(euros) >= 1000) return `${Math.round(euros / 100) / 10}k€`;
  return `${Math.round(euros)}€`;
}
