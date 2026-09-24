import type { RecurrenceFrequency } from "@prisma/client";
import { WEEKDAY_LABELS, MONTH_LABELS } from "./date";

function ordinal(day: number): string {
  return day === 1 ? "1er" : String(day);
}

/** "Le 3 de chaque mois" / "Chaque lundi" / "Le 15 décembre". */
export function describeFrequency(rule: {
  frequency: RecurrenceFrequency;
  dayOfMonth: number | null;
  month: number | null;
  dayOfWeek: number | null;
}): string {
  switch (rule.frequency) {
    case "MONTHLY":
      return rule.dayOfMonth ? `Le ${ordinal(rule.dayOfMonth)} de chaque mois` : "Chaque mois";
    case "YEARLY":
      return rule.dayOfMonth && rule.month
        ? `Le ${ordinal(rule.dayOfMonth)} ${MONTH_LABELS[rule.month - 1]}`
        : "Chaque année";
    case "WEEKLY":
      return rule.dayOfWeek !== null ? `Chaque ${WEEKDAY_LABELS[rule.dayOfWeek]}` : "Chaque semaine";
    default:
      return "";
  }
}
