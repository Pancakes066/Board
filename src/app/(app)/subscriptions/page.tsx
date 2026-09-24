import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SubscriptionsPage() {
  return (
    <div>
      <PageHeader
        title="Abonnements"
        description="Tous vos abonnements récurrents et leur coût mensuel/annuel."
      />
      <ComingSoon label="La liste des abonnements" />
    </div>
  );
}
