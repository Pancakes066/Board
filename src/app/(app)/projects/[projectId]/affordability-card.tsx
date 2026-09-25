import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatCurrency, formatSignedCurrency } from "@/lib/utils/currency";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Section 10 of the brief, verbatim: purely descriptive numbers, no
 * financial advice or judgement — the user reads their own situation.
 * `neededMonthlyCents`/`monthsRemaining` come from the linked SavingsGoal's
 * own projection math (goal-projection.ts); `availableMonthlyCents` is this
 * month's "argent réellement disponible" from the main forecast — the same
 * number the dashboard shows, not a separate estimate invented here.
 */
export function AffordabilityCard({
  estimatedAmountCents,
  budgetSafetyMarginPct,
  savedCents,
  remainingCents,
  monthsRemaining,
  neededMonthlyCents,
  availableMonthlyCents,
}: {
  estimatedAmountCents: number;
  budgetSafetyMarginPct: number | null;
  savedCents: number;
  remainingCents: number;
  monthsRemaining: number | null;
  neededMonthlyCents: number | null;
  availableMonthlyCents: number;
}) {
  const recommendedCents = budgetSafetyMarginPct
    ? Math.round(estimatedAmountCents * (1 + budgetSafetyMarginPct / 100))
    : null;
  const differenceCents = neededMonthlyCents !== null ? availableMonthlyCents - neededMonthlyCents : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Puis-je me le permettre ?</CardTitle>
        <CardDescription>Les chiffres, sans jugement — à vous de conclure.</CardDescription>
      </CardHeader>
      <CardContent>
        <Line label="Budget total estimé" value={formatCurrency(estimatedAmountCents)} />
        {recommendedCents !== null && (
          <Line
            label={`Budget recommandé (marge +${budgetSafetyMarginPct}%)`}
            value={formatCurrency(recommendedCents)}
          />
        )}
        <Line label="Déjà économisé" value={formatCurrency(savedCents)} />
        <Line label="Reste à financer" value={formatCurrency(Math.max(remainingCents, 0))} />
        {monthsRemaining !== null && (
          <Line label="Temps restant" value={`${monthsRemaining} mois`} />
        )}
        {neededMonthlyCents !== null && (
          <Line label="Épargne mensuelle nécessaire" value={formatCurrency(neededMonthlyCents)} />
        )}
        <Line
          label="Argent disponible ce mois-ci selon les prévisions"
          value={formatCurrency(availableMonthlyCents)}
        />
        {differenceCents !== null && (
          <div className="mt-1 border-t border-border pt-1.5">
            <Line label="Différence" value={formatSignedCurrency(differenceCents)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
