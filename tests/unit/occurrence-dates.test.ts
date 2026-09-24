import { describe, expect, it } from "vitest";
import { computeOccurrenceDates } from "@/server/services/recurrence/occurrence-dates";

const base = {
  dayOfMonth: null as number | null,
  month: null as number | null,
  dayOfWeek: null as number | null,
  startDate: new Date(Date.UTC(2020, 0, 1)),
  endDate: null as Date | null,
};

describe("computeOccurrenceDates", () => {
  it("clamps a 31st-of-month rule to the last day of a shorter month", () => {
    const rule = { ...base, frequency: "MONTHLY" as const, dayOfMonth: 31 };
    const feb2026 = computeOccurrenceDates(rule, { year: 2026, month: 2 });
    expect(feb2026).toHaveLength(1);
    expect(feb2026[0].getUTCDate()).toBe(28); // 2026 is not a leap year

    const feb2028 = computeOccurrenceDates(rule, { year: 2028, month: 2 });
    expect(feb2028[0].getUTCDate()).toBe(29); // 2028 is a leap year

    const jan2026 = computeOccurrenceDates(rule, { year: 2026, month: 1 });
    expect(jan2026[0].getUTCDate()).toBe(31); // unaffected in a 31-day month
  });

  it("generates a single date for a MONTHLY rule on a normal day", () => {
    const rule = { ...base, frequency: "MONTHLY" as const, dayOfMonth: 3 };
    const dates = computeOccurrenceDates(rule, { year: 2026, month: 9 });
    expect(dates).toHaveLength(1);
    expect(dates[0].toISOString()).toBe("2026-09-03T00:00:00.000Z");
  });

  it("only fires a YEARLY rule in its configured month", () => {
    const rule = { ...base, frequency: "YEARLY" as const, dayOfMonth: 25, month: 12 };
    expect(computeOccurrenceDates(rule, { year: 2026, month: 12 })).toHaveLength(1);
    expect(computeOccurrenceDates(rule, { year: 2026, month: 11 })).toHaveLength(0);
  });

  it("generates every matching weekday for a WEEKLY rule (Monday = 1)", () => {
    const rule = { ...base, frequency: "WEEKLY" as const, dayOfWeek: 1 };
    const dates = computeOccurrenceDates(rule, { year: 2026, month: 9 });
    // September 2026 has 5 Mondays: 7, 14, 21, 28
    expect(dates.map((d) => d.getUTCDate())).toEqual([7, 14, 21, 28]);
    for (const d of dates) expect(d.getUTCDay()).toBe(1);
  });

  it("excludes a date before startDate", () => {
    const rule = {
      ...base,
      frequency: "MONTHLY" as const,
      dayOfMonth: 5,
      startDate: new Date(Date.UTC(2026, 8, 20)), // Sept 20, 2026
    };
    expect(computeOccurrenceDates(rule, { year: 2026, month: 9 })).toHaveLength(0);
    expect(computeOccurrenceDates(rule, { year: 2026, month: 10 })).toHaveLength(1);
  });

  it("excludes a date after endDate", () => {
    const rule = {
      ...base,
      frequency: "MONTHLY" as const,
      dayOfMonth: 15,
      endDate: new Date(Date.UTC(2026, 8, 10)), // Sept 10, 2026
    };
    expect(computeOccurrenceDates(rule, { year: 2026, month: 9 })).toHaveLength(0);
    expect(computeOccurrenceDates(rule, { year: 2026, month: 8 })).toHaveLength(1);
  });

  it("returns nothing when the required field for the frequency is missing", () => {
    expect(
      computeOccurrenceDates({ ...base, frequency: "MONTHLY" as const }, { year: 2026, month: 9 }),
    ).toHaveLength(0);
    expect(
      computeOccurrenceDates(
        { ...base, frequency: "YEARLY" as const, dayOfMonth: 1 },
        { year: 2026, month: 9 },
      ),
    ).toHaveLength(0);
    expect(
      computeOccurrenceDates({ ...base, frequency: "WEEKLY" as const }, { year: 2026, month: 9 }),
    ).toHaveLength(0);
  });
});
