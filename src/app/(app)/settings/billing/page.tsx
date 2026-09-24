import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth/session";

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
            Prévisions avancées, insights automatiques, import CSV/Excel et plus encore avec
            Premium.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled>Passer à Premium (bientôt disponible)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
