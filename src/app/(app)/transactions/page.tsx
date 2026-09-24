import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function TransactionsPage() {
  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Vos transactions prévues et effectuées, mois par mois."
      />
      <ComingSoon label="La liste des transactions" />
    </div>
  );
}
