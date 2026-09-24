import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Paramètres" description="Votre profil et vos préférences." />
      <ComingSoon label="Les paramètres du profil" />
    </div>
  );
}
