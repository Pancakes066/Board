import { prisma } from "@/server/db/prisma";

// Free, keyless, ECB-sourced daily rates — swap this one function if the
// provider ever needs to change; nothing else in this module cares.
const FRANKFURTER_BASE_URL = "https://api.frankfurter.app/latest";
const FETCH_TIMEOUT_MS = 5000;
// Below this age, a cached rate is reused without a network call at all —
// still an honest "dernière mise à jour", just not re-fetched every read.
// Frankfurter only publishes once per business day, so this is generous
// headroom, not a source of staleness.
const CACHE_FRESH_MS = 12 * 60 * 60 * 1000;

export type RateResult = {
  rate: number;
  /** The date the rate is FOR, as published by the source — never our own
   * fetch instant. Date-only (no time), because that's what the source
   * itself provides. */
  fetchedAt: Date;
  /** true only when a live fetch was attempted and failed, and this is a
   * fallback to a previously cached (possibly old) value. */
  stale: boolean;
};

type LiveRate = { rate: number; date: Date };

/** Parses and validates a Frankfurter `/latest` response. Returns null for
 * ANY shape that isn't unambiguously "1 `base` = X `quote`, published on
 * date Y" — a wrong currency code, a missing rate, or a response for a
 * different base than requested are all treated as "no rate available",
 * never coerced into a number. */
async function fetchLiveRate(base: string, quote: string): Promise<LiveRate | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`${FRANKFURTER_BASE_URL}?from=${base}&to=${quote}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as { base?: string; date?: string; rates?: Record<string, number> };

    // The response must actually be quoted against the base we asked for —
    // this is exactly the "vérifier que le sens du taux est correct" check:
    // a response for the wrong base would otherwise silently produce an
    // inverted or unrelated number.
    if (typeof data.base !== "string" || data.base.toUpperCase() !== base.toUpperCase()) {
      return null;
    }
    const rate = data.rates?.[quote];
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      return null;
    }
    const date = data.date ? new Date(`${data.date}T00:00:00Z`) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return null;
    }

    return { rate, date };
  } catch {
    // Network down, DNS blocked, timeout, malformed JSON — all treated the
    // same: no live rate available right now, fall back to cache.
    return null;
  }
}

async function latestCached(base: string, quote: string) {
  return prisma.exchangeRate.findFirst({
    where: { baseCurrency: base, quoteCurrency: quote },
    orderBy: [{ date: "desc" }, { fetchedAt: "desc" }],
  });
}

/** 1 unit of `base` = the returned rate's worth of `quote`. Never fabricates
 * a number: returns null only when there is truly nothing to show (no live
 * fetch succeeded and nothing was ever cached for this pair).
 *
 * Storage is append-only (one row per pair per published date, upserted
 * only when re-fetching the SAME day's rate) rather than a single row
 * overwritten in place — so this cache doubles as a growing rate history,
 * ready for a future evolution chart, without any extra bookkeeping now. */
export async function getRate(base: string, quote: string): Promise<RateResult | null> {
  if (base === quote) return { rate: 1, fetchedAt: new Date(), stale: false };

  const cached = await latestCached(base, quote);
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_FRESH_MS) {
    return { rate: cached.rate, fetchedAt: cached.date, stale: false };
  }

  const live = await fetchLiveRate(base, quote);
  if (live !== null) {
    const saved = await prisma.exchangeRate.upsert({
      where: {
        baseCurrency_quoteCurrency_date: {
          baseCurrency: base,
          quoteCurrency: quote,
          date: live.date,
        },
      },
      update: { rate: live.rate, fetchedAt: new Date() },
      create: { baseCurrency: base, quoteCurrency: quote, rate: live.rate, date: live.date },
    });
    return { rate: saved.rate, fetchedAt: saved.date, stale: false };
  }

  if (cached) {
    return { rate: cached.rate, fetchedAt: cached.date, stale: true };
  }
  return null;
}
