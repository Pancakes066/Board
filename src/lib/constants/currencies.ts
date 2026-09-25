/** A curated, easily-extensible list — add a row here to support a new
 * currency, no migration needed. Codes are ISO 4217. */
export const CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "Dollar américain" },
  { code: "GBP", symbol: "£", label: "Livre sterling" },
  { code: "JPY", symbol: "¥", label: "Yen japonais" },
  { code: "CHF", symbol: "CHF", label: "Franc suisse" },
  { code: "CAD", symbol: "$", label: "Dollar canadien" },
  { code: "AUD", symbol: "$", label: "Dollar australien" },
  { code: "THB", symbol: "฿", label: "Baht thaïlandais" },
  { code: "CNY", symbol: "¥", label: "Yuan chinois" },
  { code: "MXN", symbol: "$", label: "Peso mexicain" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const DEFAULT_CURRENCY: CurrencyCode = "EUR";

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}
