import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SavingsPage() {
  return (
    <div>
      <PageHeader
        title="Épargne"
        description="Vos objectifs d'épargne et votre épargne prévue chaque mois."
      />
      <ComingSoon label="Les objectifs d'épargne" />
    </div>
  );
}
