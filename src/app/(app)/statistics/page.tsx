import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function StatisticsPage() {
  return (
    <div>
      <PageHeader
        title="Statistiques"
        description="Vos dépenses et revenus, catégorie par catégorie et mois après mois."
      />
      <ComingSoon label="Les statistiques" />
    </div>
  );
}
