-- DropIndex
DROP INDEX "ExchangeRate_baseCurrency_quoteCurrency_key";

-- AlterTable
ALTER TABLE "ExchangeRate" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "ExchangeRate_baseCurrency_quoteCurrency_date_idx" ON "ExchangeRate"("baseCurrency", "quoteCurrency", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_baseCurrency_quoteCurrency_date_key" ON "ExchangeRate"("baseCurrency", "quoteCurrency", "date");
