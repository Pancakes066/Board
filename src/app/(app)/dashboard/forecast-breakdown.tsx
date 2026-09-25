import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import type { Forecast } from "@/server/services/forecast/available-money";

function Line({
  label,
  cents,
  emphasis = false,
}: {
  label: string;
  cents: number;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={emphasis ? "font-medium" : "text-sm text-muted-foreground"}>{label}</span>
      <span className={emphasis ? "font-semibold tabular-nums" : "tabular-nums"}>
        {formatCurrency(cents)}
      </span>
    </div>
  );
}

/**
 * The plan's detailed breakdown: what's already happened vs what's still
 * projected, split fixed vs variable, plus the reconciliation formula that
 * produces "argent disponible" — spelled out line by line rather than left
 * as a single opaque number.
 */
export function ForecastBreakdown({ forecast }: { forecast: Forecast }) {
  const projectedRemaining = forecast.projectedVariableSpend - forecast.actualVariableExpenses;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Détail des prévisions</CardTitle>
        <CardDescription>D&apos;où vient le montant disponible ce mois-ci.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-1">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Déjà arrivé
          </p>
          <Line label="Dépenses fixes payées" cents={forecast.actualFixedExpenses} />
          {forecast.actualProjectExpenses > 0 && (
            <Line label="Dépenses de projets payées" cents={forecast.actualProjectExpenses} />
          )}
          <Line label="Dépenses variables effectuées" cents={forecast.actualVariableExpenses} />
          <div className="mt-1 border-t border-border pt-1.5">
            <Line label="Total déjà dépensé" cents={forecast.alreadySpent} emphasis />
          </div>
        </div>
        <div className="flex-1">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pas encore arrivé
          </p>
          <Line label="Dépenses fixes réservées" cents={forecast.reservedExpenses} />
          {forecast.reservedProjectExpenses > 0 && (
            <Line label="Dépenses de projets réservées" cents={forecast.reservedProjectExpenses} />
          )}
          <Line label="Dépenses variables probables" cents={Math.max(projectedRemaining, 0)} />
          <Line label="Épargne réservée" cents={forecast.reservedSavings} />
        </div>
      </CardContent>
      <CardContent className="border-t border-border pt-4">
        <Line label="Revenus prévus" cents={forecast.forecastedIncome} />
        <Line label="− Dépenses totales prévues" cents={forecast.totalForecastedExpenses} />
        <Line label="− Épargne prévue" cents={forecast.forecastedSavings} />
        <div className="mt-1 border-t border-border pt-1.5">
          <Line label="= Argent réellement disponible" cents={forecast.available} emphasis />
        </div>
      </CardContent>
    </Card>
  );
}
