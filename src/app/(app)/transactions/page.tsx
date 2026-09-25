import { PageHeader } from "@/components/layout/page-header";
import { UpsellCard } from "@/components/upsell-card";
import { requireUser } from "@/server/auth/session";
import { listTransactionsForPeriod } from "@/server/services/transactions/transactions";
import { listCategoriesForUser } from "@/server/services/categories/categories";
import { listAccountOptions } from "@/server/services/accounts/accounts";
import { canUse } from "@/server/entitlements/entitlements";
import { FEATURES, FREE_LIMITS } from "@/server/entitlements/plans";
import { periodOf, monthsBetweenPeriods, type Period } from "@/lib/utils/date";
import { TransactionsTabs } from "./transactions-tabs";
import { MonthNav } from "./month-nav";
import { GenerateMonthButton } from "./generate-month-button";
import { TransactionList } from "./transaction-list";

function parsePeriod(searchParams: Record<string, string | string[] | undefined>): Period {
  const year = Number(searchParams.year);
  const month = Number(searchParams.month);
  if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
    return { year, month };
  }
  return periodOf(new Date());
}

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const user = await requireUser();
  const params = await searchParams;
  const period = parsePeriod(params);
  const now = periodOf(new Date());

  // The one freemium gate wired for V1 (per the plan): FREE can't browse
  // further back than FREE_LIMITS.historyMonths. Never gates the current
  // or a future month — only looking backward past the window.
  const monthsBack = monthsBetweenPeriods(period, now);
  const withinFreeHistory = monthsBack <= FREE_LIMITS.historyMonths;
  const hasUnlimitedHistory = withinFreeHistory || (await canUse(FEATURES.UNLIMITED_HISTORY));

  const [transactions, categories, accounts] = await Promise.all([
    hasUnlimitedHistory ? listTransactionsForPeriod(user.id, period) : Promise.resolve([]),
    listCategoriesForUser(user.id),
    listAccountOptions(user.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Vos transactions prévues et effectuées, mois par mois."
      />
      <TransactionsTabs />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <MonthNav period={period} />
        <GenerateMonthButton period={period} />
      </div>
      {hasUnlimitedHistory ? (
        <TransactionList transactions={transactions} categories={categories} accounts={accounts} />
      ) : (
        <UpsellCard message="L'historique au-delà de 3 mois fait partie de Board Premium. Passez à Premium pour consulter et modifier tout votre historique." />
      )}
    </div>
  );
}
