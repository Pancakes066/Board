import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { requireUser } from "@/server/auth/session";
import { generateRollingWindow } from "@/server/services/recurrence/sync-forward";
import { getForecast } from "@/server/services/forecast/available-money";
import { getCurrentBalance, getBalanceHistory } from "@/server/services/forecast/balance";
import { currentTimestamp, periodOf, previousPeriod, MONTH_LABELS } from "@/lib/utils/date";
import { StatTile, type Delta } from "./stat-tile";
import { BalanceChart } from "./balance-chart";
import { ForecastBreakdown } from "./forecast-breakdown";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date(currentTimestamp());
  const period = periodOf(now);
  const lastMonth = previousPeriod(period);

  // Trigger point #1 from the plan: a dashboard visit generates the
  // current + next month's occurrences, so numbers here are never stale
  // just because the user hasn't opened Transactions or clicked "Generate
  // month" yet.
  await generateRollingWindow(user.id, now);

  const [forecast, lastMonthForecast, balance, balanceHistory] = await Promise.all([
    getForecast(user.id, period, now),
    getForecast(user.id, lastMonth, now),
    getCurrentBalance(user.id, now),
    getBalanceHistory(user.id, now),
  ]);

  function delta(current: number, previous: number, upIsGood: boolean): Delta {
    return { currentCents: current, previousCents: previous, upIsGood };
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Bonjour${user.name ? `, ${user.name}` : ""} 👋`}
        description={`Voici où vous en êtes en ${MONTH_LABELS[period.month - 1]}.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Solde actuel" valueCents={balance} />
        <StatTile
          label="Argent réellement disponible"
          valueCents={forecast.available}
          hero
          delta={delta(forecast.available, lastMonthForecast.available, true)}
        />
        <StatTile
          label="Revenus du mois"
          valueCents={forecast.actualIncome}
          delta={delta(forecast.actualIncome, lastMonthForecast.actualIncome, true)}
        />
        <StatTile
          label="Dépenses du mois"
          valueCents={forecast.alreadySpent}
          delta={delta(forecast.alreadySpent, lastMonthForecast.alreadySpent, false)}
        />
        <StatTile
          label="Épargne du mois"
          valueCents={forecast.actualSavings}
          delta={delta(forecast.actualSavings, lastMonthForecast.actualSavings, true)}
        />
        <StatTile
          label="Revenus prévus"
          valueCents={forecast.forecastedIncome}
          delta={delta(forecast.forecastedIncome, lastMonthForecast.forecastedIncome, true)}
        />
        <StatTile
          label="Dépenses prévues"
          valueCents={forecast.totalForecastedExpenses}
          delta={delta(
            forecast.totalForecastedExpenses,
            lastMonthForecast.totalForecastedExpenses,
            false,
          )}
        />
        <StatTile
          label="Épargne prévue"
          valueCents={forecast.forecastedSavings}
          delta={delta(forecast.forecastedSavings, lastMonthForecast.forecastedSavings, true)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Évolution du solde</CardTitle>
        </CardHeader>
        <CardContent>
          <BalanceChart points={balanceHistory} />
        </CardContent>
      </Card>

      <ForecastBreakdown forecast={forecast} />
    </div>
  );
}
