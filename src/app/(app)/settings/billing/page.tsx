import { Check } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth/session";
import { FEATURES, hasFeature, type Feature } from "@/server/entitlements/plans";

const FEATURE_LABELS: Record<Feature, string> = {
  [FEATURES.ADVANCED_FORECAST]: "Prévisions avancées",
  [FEATURES.ADVANCED_SAVINGS_GOALS]: "Objectifs d'épargne avancés",
  [FEATURES.AUTOMATIC_INSIGHTS]: "Insights automatiques",
  [FEATURES.CSV_IMPORT]: "Import CSV/Excel",
  [FEATURES.AUTO_CATEGORIZATION]: "Catégorisation automatique",
  [FEATURES.MULTIPLE_ACCOUNTS]: "Plusieurs comptes",
  [FEATURES.UNLIMITED_HISTORY]: "Historique illimité",
  [FEATURES.ADVANCED_STATS]: "Statistiques avancées",
  [FEATURES.DASHBOARD_CUSTOMIZATION]: "Personnalisation du dashboard",
};

export default async function BillingSettingsPage() {
  const user = await requireUser();

  return (
    <div>
      <PageHeader title="Abonnement" description="Votre formule Board." />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Formule actuelle</CardTitle>
            <Badge variant={user.plan === "PREMIUM" ? "default" : "secondary"}>
              {user.plan === "PREMIUM" ? "Premium" : "Gratuite"}
            </Badge>
          </div>
          <CardDescription>
            {user.plan === "PREMIUM"
              ? "Merci de soutenir Board 🙏"
              : "Passez à Premium pour débloquer l'historique illimité et plus encore."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.values(FEATURES).map((feature) => {
              const included = hasFeature(user.plan, feature);
              return (
                <li
                  key={feature}
                  className={`flex items-center gap-2 text-sm ${included ? "" : "text-muted-foreground"}`}
                >
                  <Check className={`size-3.5 ${included ? "text-positive" : "opacity-30"}`} />
                  {FEATURE_LABELS[feature]}
                </li>
              );
            })}
          </ul>
          {user.plan === "FREE" && (
            <Button disabled className="w-fit">
              Passer à Premium (bientôt disponible)
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
