import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SecuritySettingsPage() {
  return (
    <div>
      <PageHeader
        title="Sécurité et données"
        description="Mot de passe, export de vos données, suppression du compte."
      />
      <ComingSoon label="La gestion de la sécurité et des données" />
    </div>
  );
}
