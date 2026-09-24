import { ArrowUp, ArrowDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

export type Delta = {
  currentCents: number;
  previousCents: number;
  /** Whether an increase counts as good news for this metric (income: yes, expenses: no). */
  upIsGood: boolean;
};

function DeltaBadge({ delta }: { delta: Delta }) {
  const diff = delta.currentCents - delta.previousCents;
  if (diff === 0) return <span className="text-xs text-muted-foreground">= mois dernier</span>;

  const up = diff > 0;
  const good = up === delta.upIsGood;
  const pct =
    delta.previousCents !== 0 ? Math.round((Math.abs(diff) / Math.abs(delta.previousCents)) * 100) : null;
  const Icon = up ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        good ? "text-positive" : "text-destructive",
      )}
    >
      <Icon className="size-3" />
      {formatCurrency(Math.abs(diff))}
      {pct !== null && ` (${pct}%)`}
      <span className="font-normal text-muted-foreground">vs mois dernier</span>
    </span>
  );
}

export function StatTile({
  label,
  valueCents,
  delta,
  hero = false,
}: {
  label: string;
  valueCents: number;
  delta?: Delta;
  hero?: boolean;
}) {
  return (
    <Card className={cn(hero && "border-primary/40 bg-primary/5")}>
      <CardContent className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            hero ? "text-4xl text-primary" : "text-2xl",
          )}
        >
          {formatCurrency(valueCents)}
        </span>
        {delta && <DeltaBadge delta={delta} />}
      </CardContent>
    </Card>
  );
}
