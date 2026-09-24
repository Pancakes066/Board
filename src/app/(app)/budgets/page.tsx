import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function BudgetsPage() {
  return (
    <div>
      <PageHeader title="Budgets" description="Un plafond par catégorie, avec suivi visuel." />
      <ComingSoon label="Les budgets" />
    </div>
  );
}
