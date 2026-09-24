import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth/session";
import { listSubscriptions, sumSubscriptionTotals } from "@/server/services/subscriptions/subscription-totals";
import { currentTimestamp, formatDate } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";

const FREQUENCY_SUFFIX = { MONTHLY: "/mois", WEEKLY: "/semaine", YEARLY: "/an" } as const;

export default async function SubscriptionsPage() {
  const user = await requireUser();
  const now = new Date(currentTimestamp());

  const subscriptions = await listSubscriptions(user.id, now);
  const totals = sumSubscriptionTotals(subscriptions);

  return (
    <div>
      <PageHeader
        title="Abonnements"
        description="Tous vos abonnements récurrents et leur coût mensuel/annuel."
        action={
          <Button variant="outline" asChild>
            <Link href="/transactions/recurring">Gérer les abonnements</Link>
          </Button>
        }
      />

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aucun abonnement pour l&apos;instant. Cochez « C&apos;est un abonnement » sur une dépense
            récurrente pour qu&apos;elle apparaisse ici.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="flex flex-wrap gap-8">
              <div>
                <p className="text-sm text-muted-foreground">Total mensuel</p>
                <p className="text-2xl font-semibold tabular-nums text-primary">
                  {formatCurrency(totals.monthlyCents)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total annuel</p>
                <p className="text-2xl font-semibold tabular-nums">{formatCurrency(totals.annualCents)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Prochaine échéance</TableHead>
                    <TableHead className="text-right">Coût mensuel</TableHead>
                    <TableHead className="text-right">Coût annuel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">
                        {sub.categoryEmoji} {sub.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(sub.amountCents)}
                        {FREQUENCY_SUFFIX[sub.frequency]}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sub.nextDueDate ? formatDate(sub.nextDueDate) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(sub.monthlyCostCents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(sub.annualCostCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
