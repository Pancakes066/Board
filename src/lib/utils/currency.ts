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

/** Compact axis-tick label: "1,7k€" above 1000€, "45€" below — shared so
 * every chart's Y-axis converts cents the same way (a chart-local copy of
 * this once got the cents->euros->k division wrong by a factor of 100). */
export function formatCompactCurrency(cents: number): string {
  const euros = cents / 100;
  if (Math.abs(euros) >= 1000) return `${Math.round(euros / 100) / 10}k€`;
  return `${Math.round(euros)}€`;
}
