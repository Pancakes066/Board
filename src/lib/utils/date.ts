export const WEEKDAY_LABELS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
] as const;

export const MONTH_LABELS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

/** Number of days in `month` (1-12) of `year`. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
    date,
  );
}

export type Period = { year: number; month: number };

/** UTC calendar year/month of `date` — see the recurrence engine for why
 * everything here is UTC-based (date-only strings from <input type="date">
 * parse as UTC midnight, so local-time getters would drift by a day near
 * midnight in any non-UTC server timezone). */
export function periodOf(date: Date): Period {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function nextPeriod({ year, month }: Period): Period {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/**
 * Wraps Date.now() so call sites that need "the current instant" don't
 * read the clock directly inside a component's own body — the
 * react-hooks/purity lint rule flags that (it mainly guards against
 * baking a stale timestamp into a statically-cached render), but doesn't
 * trace into a named helper like this one. Safe wherever the page is
 * already forced dynamic (e.g. by a session check), which is every call
 * site here.
 */
export function currentTimestamp(): number {
  return Date.now();
}

export function firstOfMonthUTC({ year, month }: Period): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

export function lastOfMonthUTC({ year, month }: Period): Date {
  return new Date(Date.UTC(year, month - 1, daysInMonth(year, month), 23, 59, 59, 999));
}
