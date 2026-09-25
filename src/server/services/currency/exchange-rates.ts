import { prisma } from "@/server/db/prisma";

// Free, keyless, ECB-sourced daily rates — swap this one function if the
// provider ever needs to change; nothing else in this module cares.
const FRANKFURTER_BASE_URL = "https://api.frankfurter.app/latest";
const FETCH_TIMEOUT_MS = 5000;
// Below this age, a cached rate is reused without a network call at all —
// still an honest "dernière mise à jour", just not re-fetched every read.
const CACHE_FRESH_MS = 12 * 60 * 60 * 1000;

export type RateResult = {
  rate: number;
  fetchedAt: Date;
  /** true only when a live fetch was attempted and failed, and this is a
   * fallback to a previously cached (possibly old) value. */
  stale: boolean;
};

async function fetchLiveRate(base: string, quote: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`${FRANKFURTER_BASE_URL}?from=${base}&to=${quote}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.[quote];
    return typeof rate === "number" ? rate : null;
  } catch {
    // Network down, DNS blocked, timeout, malformed response — all treated
    // the same: no live rate available right now, fall back to cache.
    return null;
  }
}

/** 1 unit of `base` = the returned rate's worth of `quote`. Never fabricates
 * a number: returns null only when there is truly nothing to show (no live
 * fetch succeeded and nothing was ever cached for this pair). */
export async function getRate(base: string, quote: string): Promise<RateResult | null> {
  if (base === quote) return { rate: 1, fetchedAt: new Date(), stale: false };

  const key = { baseCurrency_quoteCurrency: { baseCurrency: base, quoteCurrency: quote } };
  const cached = await prisma.exchangeRate.findUnique({ where: key });

  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_FRESH_MS) {
    return { rate: cached.rate, fetchedAt: cached.fetchedAt, stale: false };
  }

  const live = await fetchLiveRate(base, quote);
  if (live !== null) {
    const saved = await prisma.exchangeRate.upsert({
      where: key,
      update: { rate: live, fetchedAt: new Date() },
      create: { baseCurrency: base, quoteCurrency: quote, rate: live },
    });
    return { rate: saved.rate, fetchedAt: saved.fetchedAt, stale: false };
  }

  if (cached) {
    return { rate: cached.rate, fetchedAt: cached.fetchedAt, stale: true };
  }
  return null;
}
