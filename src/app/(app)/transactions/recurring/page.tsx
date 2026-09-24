import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function RecurringRulesPage() {
  return (
    <div>
      <PageHeader
        title="Revenus et dépenses récurrents"
        description="Configurez-les une fois, ils se génèrent automatiquement chaque mois."
      />
      <ComingSoon label="La gestion des règles récurrentes" />
    </div>
  );
}
