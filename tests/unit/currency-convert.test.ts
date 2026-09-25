import { describe, expect, it } from "vitest";
import { convertCents, applyMargin, applyRateMargin } from "@/server/services/currency/convert";

describe("convertCents", () => {
  it("converts using the given rate, rounded to the nearest cent", () => {
    // 1000€ -> ¥, rate 1 EUR = 160 JPY -> spec's own worked example.
    expect(convertCents(100_000, 160)).toBe(16_000_000);
  });

  it("rounds fractional cents", () => {
    expect(convertCents(100, 1.256)).toBe(126); // 125.6 -> 126
  });
});

describe("applyMargin", () => {
  it("adds the percentage on top", () => {
    // Spec's own example: 2500€ budget, 10% margin -> 2750€.
    expect(applyMargin(250_000, 10)).toBe(275_000);
  });

  it("returns the amount unchanged when margin is null/undefined/zero", () => {
    expect(applyMargin(250_000, null)).toBe(250_000);
    expect(applyMargin(250_000, undefined)).toBe(250_000);
    expect(applyMargin(250_000, 0)).toBe(250_000);
  });
});

describe("applyRateMargin", () => {
  it("reduces the rate so 1 unit of base buys less quote (a cushion)", () => {
    // Spec's own example: 1€ = 160 JPY, 5% margin -> 1€ = ~152.38 JPY.
    const margined = applyRateMargin(160, 5);
    expect(margined).toBeCloseTo(152.38, 1);
  });

  it("returns the rate unchanged when margin is null/undefined/zero", () => {
    expect(applyRateMargin(160, null)).toBe(160);
    expect(applyRateMargin(160, undefined)).toBe(160);
    expect(applyRateMargin(160, 0)).toBe(160);
  });
});
