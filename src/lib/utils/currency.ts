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
