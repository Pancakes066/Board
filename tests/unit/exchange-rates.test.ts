import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { getRate } from "@/server/services/currency/exchange-rates";
import { convertCents } from "@/server/services/currency/convert";

const PAIR = { baseCurrency: "EUR", quoteCurrency: "XTS" }; // XTS = ISO "test" currency code

function frankfurterResponse(base: string, quote: string, rate: number, date = "2026-09-25") {
  return { ok: true, json: async () => ({ base, date, rates: { [quote]: rate } }) };
}

afterEach(async () => {
  await prisma.exchangeRate.deleteMany({ where: PAIR });
  vi.unstubAllGlobals();
});

describe("getRate", () => {
  it("returns 1 without any I/O when base === quote", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await getRate("EUR", "EUR");
    expect(result).toMatchObject({ rate: 1, stale: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reuses a fresh cached rate without calling fetch", async () => {
    await prisma.exchangeRate.create({
      data: { ...PAIR, rate: 42, date: new Date(), fetchedAt: new Date() },
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await getRate(PAIR.baseCurrency, PAIR.quoteCurrency);

    expect(result).toMatchObject({ rate: 42, stale: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to a stale cached rate when the live fetch fails, and says so", async () => {
    const oldFetchedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days old
    const rateDate = new Date("2026-08-26T00:00:00Z");
    await prisma.exchangeRate.create({
      data: { ...PAIR, rate: 99, date: rateDate, fetchedAt: oldFetchedAt },
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await getRate(PAIR.baseCurrency, PAIR.quoteCurrency);

    expect(result).toMatchObject({ rate: 99, stale: true });
    // The date shown is the source's own published date, never our fetch time.
    expect(result?.fetchedAt.getTime()).toBe(rateDate.getTime());
  });

  it("returns null — never a fabricated number — when nothing is cached and the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await getRate(PAIR.baseCurrency, PAIR.quoteCurrency);
    expect(result).toBeNull();
  });

  it("fetches, caches, and returns a live rate when the API responds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(frankfurterResponse(PAIR.baseCurrency, PAIR.quoteCurrency, 7.5)),
    );

    const result = await getRate(PAIR.baseCurrency, PAIR.quoteCurrency);

    expect(result).toMatchObject({ rate: 7.5, stale: false });
    expect(result?.fetchedAt.toISOString().slice(0, 10)).toBe("2026-09-25");
    const cached = await prisma.exchangeRate.findFirst({ where: PAIR });
    expect(cached?.rate).toBe(7.5);
  });

  it("uses the source's own published date, not the fetch instant, as fetchedAt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(frankfurterResponse(PAIR.baseCurrency, PAIR.quoteCurrency, 5, "2026-01-15")),
    );
    const result = await getRate(PAIR.baseCurrency, PAIR.quoteCurrency);
    expect(result?.fetchedAt.toISOString().slice(0, 10)).toBe("2026-01-15");
  });

  // --- Malformed/wrong-shape responses: every case below must be treated
  // exactly like a network failure (fall back to cache, or null) — never
  // produce a garbage or inverted rate. This is the direct regression test
  // for the "1 EUR = 76 302 JPY but result = 8 JPY" class of bug. ---
  describe("response validation never trusts a malformed or mismatched response", () => {
    it("rejects a response whose base doesn't match what was requested", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(frankfurterResponse("USD", PAIR.quoteCurrency, 999)),
      );
      const result = await getRate(PAIR.baseCurrency, PAIR.quoteCurrency);
      expect(result).toBeNull();
    });

    it("rejects a response missing the requested quote currency", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ base: PAIR.baseCurrency, date: "2026-09-25", rates: {} }),
      }));
      const result = await getRate(PAIR.baseCurrency, PAIR.quoteCurrency);
      expect(result).toBeNull();
    });

    it("rejects a non-numeric or non-positive rate", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ base: PAIR.baseCurrency, date: "2026-09-25", rates: { [PAIR.quoteCurrency]: -5 } }),
      }));
      expect(await getRate(PAIR.baseCurrency, PAIR.quoteCurrency)).toBeNull();
    });

    it("rejects an HTTP error response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
      expect(await getRate(PAIR.baseCurrency, PAIR.quoteCurrency)).toBeNull();
    });

    it("rejects a response with unparseable JSON", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      }));
      expect(await getRate(PAIR.baseCurrency, PAIR.quoteCurrency)).toBeNull();
    });

    it("rejects on timeout/abort", async () => {
      vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
        const err = new Error("aborted");
        err.name = "AbortError";
        return Promise.reject(err);
      }));
      expect(await getRate(PAIR.baseCurrency, PAIR.quoteCurrency)).toBeNull();
    });
  });

  // --- The exact bug class the user reported: a rate must always be
  // internally consistent with the conversion it produces (proportional,
  // and round-trippable), regardless of what a UI does with it afterward. ---
  describe("conversion is proportional and round-trips (regression for the display-drift bug)", () => {
    it("100/1000 EUR -> JPY scale linearly with the same cached rate", async () => {
      await prisma.exchangeRate.create({
        data: { ...PAIR, rate: 180.57, date: new Date(), fetchedAt: new Date() },
      });
      const rate = (await getRate(PAIR.baseCurrency, PAIR.quoteCurrency))!.rate;

      const oneHundred = convertCents(10_000, rate);
      const oneThousand = convertCents(100_000, rate);
      expect(oneThousand).toBe(oneHundred * 10);
      // And the displayed rate must be the one that actually produced this
      // number: 1000 EUR (100000 cents) * rate == the result, exactly.
      expect(Math.round(100_000 * rate)).toBe(oneThousand);
    });

    it("EUR -> JPY -> EUR round-trips to ~the original amount", async () => {
      await prisma.exchangeRate.create({
        data: { baseCurrency: "EUR", quoteCurrency: "XTS", rate: 180.57, date: new Date(), fetchedAt: new Date() },
      });
      await prisma.exchangeRate.create({
        data: { baseCurrency: "XTS", quoteCurrency: "EUR", rate: 1 / 180.57, date: new Date(), fetchedAt: new Date() },
      });

      const eurToXts = (await getRate("EUR", "XTS"))!.rate;
      const xtsToEur = (await getRate("XTS", "EUR"))!.rate;

      const startCents = 100_000; // 1000.00 EUR
      const converted = convertCents(startCents, eurToXts);
      const roundTripped = convertCents(converted, xtsToEur);

      // Rounding on two hops can drift by at most a cent or two.
      expect(Math.abs(roundTripped - startCents)).toBeLessThanOrEqual(2);

      await prisma.exchangeRate.deleteMany({ where: { baseCurrency: "XTS", quoteCurrency: "EUR" } });
    });
  });

  describe("cache lifecycle", () => {
    it("refetches once the cached rate has expired", async () => {
      const staleFetchedAt = new Date(Date.now() - 13 * 60 * 60 * 1000); // >12h TTL
      await prisma.exchangeRate.create({
        data: { ...PAIR, rate: 1, date: staleFetchedAt, fetchedAt: staleFetchedAt },
      });
      const fetchSpy = vi
        .fn()
        .mockResolvedValue(frankfurterResponse(PAIR.baseCurrency, PAIR.quoteCurrency, 2));
      vi.stubGlobal("fetch", fetchSpy);

      const result = await getRate(PAIR.baseCurrency, PAIR.quoteCurrency);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ rate: 2, stale: false });
    });
  });
});
