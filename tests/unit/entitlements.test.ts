import { describe, expect, it } from "vitest";
import { hasFeature, FEATURES, FREE_LIMITS } from "@/server/entitlements/plans";

describe("hasFeature", () => {
  it("FREE has none of the premium features", () => {
    for (const feature of Object.values(FEATURES)) {
      expect(hasFeature("FREE", feature)).toBe(false);
    }
  });

  it("PREMIUM has every feature", () => {
    for (const feature of Object.values(FEATURES)) {
      expect(hasFeature("PREMIUM", feature)).toBe(true);
    }
  });

  it("UNLIMITED_HISTORY specifically gates FREE but not PREMIUM", () => {
    expect(hasFeature("FREE", FEATURES.UNLIMITED_HISTORY)).toBe(false);
    expect(hasFeature("PREMIUM", FEATURES.UNLIMITED_HISTORY)).toBe(true);
  });
});

describe("FREE_LIMITS", () => {
  it("has a positive history window", () => {
    expect(FREE_LIMITS.historyMonths).toBeGreaterThan(0);
  });
});
