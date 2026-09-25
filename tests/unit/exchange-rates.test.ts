import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { getRate } from "@/server/services/currency/exchange-rates";

const PAIR = { baseCurrency: "EUR", quoteCurrency: "XTS" }; // XTS = ISO "test" currency code

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
    await prisma.exchangeRate.create({ data: { ...PAIR, rate: 42, fetchedAt: new Date() } });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await getRate(PAIR.baseCurrency, PAIR.quoteCurrency);

    expect(result).toMatchObject({ rate: 42, stale: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to a stale cached rate when the live fetch fails, and says so", async () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days old
    await prisma.exchangeRate.create({ data: { ...PAIR, rate: 99, fetchedAt: oldDate } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const result = await getRate(PAIR.baseCurrency, PAIR.quoteCurrency);

    expect(result).toMatchObject({ rate: 99, stale: true });
    expect(result?.fetchedAt.getTime()).toBe(oldDate.getTime());
  });

  it("returns null — never a fabricated number — when nothing is cached and the fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const result = await getRate(PAIR.baseCurrency, PAIR.quoteCurrency);

    expect(result).toBeNull();
  });

  it("fetches, caches, and returns a live rate when the API responds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ rates: { [PAIR.quoteCurrency]: 7.5 } }),
      }),
    );

    const result = await getRate(PAIR.baseCurrency, PAIR.quoteCurrency);

    expect(result).toMatchObject({ rate: 7.5, stale: false });
    const cached = await prisma.exchangeRate.findUnique({
      where: { baseCurrency_quoteCurrency: PAIR },
    });
    expect(cached?.rate).toBe(7.5);
  });
});
