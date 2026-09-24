import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { requireUser } from "@/server/auth/session";
import {
  getCategoryBreakdown,
  getMonthlyEvolution,
  getFixedVsVariable,
  getAverageDailySpend,
} from "@/server/services/statistics/statistics";
import { currentTimestamp, periodOf, previousPeriod, MONTH_LABELS } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";
import { CategoryBreakdownChart } from "./category-breakdown-chart";
import { EvolutionChart } from "./evolution-chart";
import { FixedVsVariable } from "./fixed-vs-variable";

export default async function StatisticsPage() {
  const user = await requireUser();
  const now = new Date(currentTimestamp());
  const period = periodOf(now);
  const lastMonth = previousPeriod(period);

  const [breakdown, evolution, fixedVsVariable, avgDaily, avgDailyLastMonth] = await Promise.all([
    getCategoryBreakdown(user.id, period),
    getMonthlyEvolution(user.id, now),
    getFixedVsVariable(user.id, period),
    getAverageDailySpend(user.id, period, now),
    getAverageDailySpend(user.id, lastMonth, now),
  ]);

  const biggestIncrease = breakdown
    .map((row) => ({ ...row, diff: row.spentCents - row.previousSpentCents }))
    .filter((row) => row.diff > 0)
    .sort((a, b) => b.diff - a.diff)[0];

  return (
    <div>
      <PageHeader
        title="Statistiques"
        description="Vos dépenses et revenus, catégorie par catégorie et mois après mois."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dépenses par catégorie</CardTitle>
            <CardDescription>
              {biggestIncrease
                ? `${biggestIncrease.emoji ?? ""} ${biggestIncrease.name} a le plus augmenté : +${formatCurrency(biggestIncrease.diff)} vs ${MONTH_LABELS[lastMonth.month - 1]}.`
                : `Ce mois-ci, en ${MONTH_LABELS[period.month - 1]}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart rows={breakdown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fixe vs variable</CardTitle>
            <CardDescription>Répartition des dépenses de {MONTH_LABELS[period.month - 1]}.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center gap-6">
            <FixedVsVariable data={fixedVsVariable} />
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Dépense moyenne / jour</p>
                <p className="text-xl font-semibold tabular-nums">{formatCurrency(avgDaily)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mois dernier</p>
                <p className="text-xl font-semibold tabular-nums text-muted-foreground">
                  {formatCurrency(avgDailyLastMonth)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Évolution sur 6 mois</CardTitle>
          <CardDescription>Revenus, dépenses et épargne effectués, mois par mois.</CardDescription>
        </CardHeader>
        <CardContent>
          <EvolutionChart points={evolution} />
        </CardContent>
      </Card>
    </div>
  );
}
