import { describe, expect, it } from "vitest";
import { computeReminderOccurrenceDates } from "@/server/services/reminders/occurrence-dates";

const base = {
  hour: 9,
  minute: 0,
  dayOfMonth: null as number | null,
  month: null as number | null,
  dayOfWeek: null as number | null,
  intervalDays: null as number | null,
  endDate: null as Date | null,
};

describe("computeReminderOccurrenceDates", () => {
  it("ONCE fires exactly once, at its own date/time", () => {
    const reminder = { ...base, date: new Date(Date.UTC(2026, 8, 28)), frequency: "ONCE" as const };
    const dates = computeReminderOccurrenceDates(reminder, {
      from: new Date(Date.UTC(2026, 8, 1)),
      to: new Date(Date.UTC(2026, 9, 1)),
    });
    expect(dates).toHaveLength(1);
    expect(dates[0].toISOString()).toBe("2026-09-28T09:00:00.000Z");
  });

  it("ONCE never fires outside the requested range", () => {
    const reminder = { ...base, date: new Date(Date.UTC(2026, 8, 28)), frequency: "ONCE" as const };
    const dates = computeReminderOccurrenceDates(reminder, {
      from: new Date(Date.UTC(2026, 9, 1)),
      to: new Date(Date.UTC(2026, 10, 1)),
    });
    expect(dates).toHaveLength(0);
  });

  it("DAILY fires every day in range from its start date", () => {
    const reminder = { ...base, date: new Date(Date.UTC(2026, 8, 1)), frequency: "DAILY" as const };
    const dates = computeReminderOccurrenceDates(reminder, {
      from: new Date(Date.UTC(2026, 8, 5)),
      to: new Date(Date.UTC(2026, 8, 8, 23, 59)),
    });
    expect(dates.map((d) => d.getUTCDate())).toEqual([5, 6, 7, 8]);
  });

  it("WEEKLY fires on the configured weekday (Monday = 1)", () => {
    const reminder = {
      ...base,
      date: new Date(Date.UTC(2026, 0, 1)),
      frequency: "WEEKLY" as const,
      dayOfWeek: 1,
    };
    const dates = computeReminderOccurrenceDates(reminder, {
      from: new Date(Date.UTC(2026, 8, 1)),
      to: new Date(Date.UTC(2026, 8, 30)),
    });
    expect(dates.map((d) => d.getUTCDate())).toEqual([7, 14, 21, 28]);
  });

  it("MONTHLY clamps the 31st to the last day of a shorter month", () => {
    const reminder = {
      ...base,
      date: new Date(Date.UTC(2026, 0, 31)),
      frequency: "MONTHLY" as const,
      dayOfMonth: 31,
    };
    const dates = computeReminderOccurrenceDates(reminder, {
      from: new Date(Date.UTC(2026, 1, 1)),
      to: new Date(Date.UTC(2026, 1, 28, 23, 59)),
    });
    expect(dates).toHaveLength(1);
    expect(dates[0].getUTCDate()).toBe(28); // 2026 is not a leap year
  });

  it("YEARLY only fires in its configured month/day", () => {
    const reminder = {
      ...base,
      date: new Date(Date.UTC(2026, 8, 28)),
      frequency: "YEARLY" as const,
      dayOfMonth: 28,
      month: 9,
    };
    const dates = computeReminderOccurrenceDates(reminder, {
      from: new Date(Date.UTC(2026, 0, 1)),
      to: new Date(Date.UTC(2028, 11, 31)),
    });
    expect(dates).toHaveLength(3);
    expect(dates.map((d) => d.getUTCFullYear())).toEqual([2026, 2027, 2028]);
  });

  it("CUSTOM repeats every N days ('tous les 12 jours')", () => {
    const reminder = {
      ...base,
      date: new Date(Date.UTC(2026, 8, 1)),
      frequency: "CUSTOM" as const,
      intervalDays: 12,
    };
    const dates = computeReminderOccurrenceDates(reminder, {
      from: new Date(Date.UTC(2026, 8, 1)),
      to: new Date(Date.UTC(2026, 9, 10)),
    });
    // Sept 1, 13, 25, Oct 7
    expect(dates.map((d) => d.getUTCDate())).toEqual([1, 13, 25, 7]);
  });

  it("respects endDate — no occurrence fires after it", () => {
    const reminder = {
      ...base,
      date: new Date(Date.UTC(2026, 8, 1)),
      frequency: "DAILY" as const,
      endDate: new Date(Date.UTC(2026, 8, 3)),
    };
    const dates = computeReminderOccurrenceDates(reminder, {
      from: new Date(Date.UTC(2026, 8, 1)),
      to: new Date(Date.UTC(2026, 8, 10)),
    });
    expect(dates.map((d) => d.getUTCDate())).toEqual([1, 2, 3]);
  });

  it("returns nothing when a required field for the frequency is missing", () => {
    const range = { from: new Date(Date.UTC(2026, 8, 1)), to: new Date(Date.UTC(2026, 8, 30)) };
    expect(
      computeReminderOccurrenceDates(
        { ...base, date: new Date(Date.UTC(2026, 8, 1)), frequency: "MONTHLY" as const },
        range,
      ),
    ).toHaveLength(0);
    expect(
      computeReminderOccurrenceDates(
        { ...base, date: new Date(Date.UTC(2026, 8, 1)), frequency: "WEEKLY" as const },
        range,
      ),
    ).toHaveLength(0);
    expect(
      computeReminderOccurrenceDates(
        { ...base, date: new Date(Date.UTC(2026, 8, 1)), frequency: "CUSTOM" as const },
        range,
      ),
    ).toHaveLength(0);
  });
});
