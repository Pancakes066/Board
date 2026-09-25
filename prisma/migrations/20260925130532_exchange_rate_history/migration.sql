-- DropIndex
DROP INDEX "ExchangeRate_baseCurrency_quoteCurrency_key";

-- ExchangeRate is a disposable cache (never user data) — any row here
-- predates the new "date" column and gets refetched transparently on next
-- use, so clearing it is safe and avoids a NOT NULL backfill problem on
-- databases that already cached a rate under the old schema.
TRUNCATE "ExchangeRate";

-- AlterTable
ALTER TABLE "ExchangeRate" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "ExchangeRate_baseCurrency_quoteCurrency_date_idx" ON "ExchangeRate"("baseCurrency", "quoteCurrency", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_baseCurrency_quoteCurrency_date_key" ON "ExchangeRate"("baseCurrency", "quoteCurrency", "date");
