export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING: "Compte courant",
  SAVINGS_BOOK: "Livret d'épargne",
  CARD: "Carte",
  CASH: "Espèces",
  OTHER: "Autre",
};

export const ACCOUNT_TYPE_OPTIONS = [
  { value: "CHECKING", label: "Compte courant" },
  { value: "SAVINGS_BOOK", label: "Livret d'épargne" },
  { value: "CARD", label: "Carte" },
  { value: "CASH", label: "Espèces" },
  { value: "OTHER", label: "Autre" },
] as const;
