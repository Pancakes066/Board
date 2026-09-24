import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";
import { TransactionsTabs } from "./transactions-tabs";

export default function TransactionsPage() {
  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Vos transactions prévues et effectuées, mois par mois."
      />
      <TransactionsTabs />
      <ComingSoon label="La liste des transactions" />
    </div>
  );
}
