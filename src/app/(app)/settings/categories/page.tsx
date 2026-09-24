import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function CategoriesSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Catégories"
        description="Catégories par défaut et catégories personnalisées."
      />
      <ComingSoon label="La gestion des catégories" />
    </div>
  );
}
