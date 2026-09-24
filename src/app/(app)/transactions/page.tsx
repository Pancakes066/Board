import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { listTransactionsForPeriod } from "@/server/services/transactions/transactions";
import { listCategoriesForUser } from "@/server/services/categories/categories";
import { periodOf, type Period } from "@/lib/utils/date";
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

  const [transactions, categories] = await Promise.all([
    listTransactionsForPeriod(user.id, period),
    listCategoriesForUser(user.id),
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
      <TransactionList transactions={transactions} categories={categories} />
    </div>
  );
}
