import { Download } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth/session";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountDialog } from "./delete-account-dialog";

export default async function SecuritySettingsPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sécurité et données"
        description="Mot de passe, export de vos données, suppression du compte."
      />

      <Card>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>Changez le mot de passe utilisé pour vous connecter.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exporter mes données</CardTitle>
          <CardDescription>
            Une copie complète de tout ce que Board sait sur vous : transactions, règles
            récurrentes, budgets, objectifs d&apos;épargne et catégories.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <a href="/api/export?format=json" download>
              <Download /> Export complet (JSON)
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="/api/export?format=csv" download>
              <Download /> Transactions (CSV)
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Zone dangereuse</CardTitle>
          <CardDescription>
            Supprimer votre compte efface définitivement toutes vos données. Cette action est
            irréversible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}
