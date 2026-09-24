"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { CategoryBreakdownRow } from "@/server/services/statistics/statistics";
import { formatCurrency } from "@/lib/utils/currency";

type Row = CategoryBreakdownRow & { label: string };

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const diff = row.spentCents - row.previousSpentCents;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{row.label}</p>
      <p className="tabular-nums">{formatCurrency(row.spentCents)}</p>
      {diff !== 0 && (
        <p className={`text-xs ${diff > 0 ? "text-destructive" : "text-positive"}`}>
          {diff > 0 ? "+" : ""}
          {formatCurrency(diff)} vs mois dernier
        </p>
      )}
    </div>
  );
}

/**
 * Magnitude comparison -> bar, single hue by default (the dataviz skill's
 * "compare magnitude" job). The one exception is emphasis: the category
 * with the largest MoM increase is highlighted in the accent color while
 * the rest stay neutral gray, which is how this one chart also answers
 * "which category increased the most" without a second chart or a legend.
 */
export function CategoryBreakdownChart({ rows }: { rows: CategoryBreakdownRow[] }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Aucune dépense ce mois-ci.</p>;
  }

  const data: Row[] = rows
    .slice(0, 8)
    .map((r) => ({ ...r, label: `${r.emoji ?? ""} ${r.name}`.trim() }));

  const biggestIncreaseId = data.reduce<{ id: string; diff: number } | null>((best, row) => {
    const diff = row.spentCents - row.previousSpentCents;
    if (diff <= 0) return best;
    if (!best || diff > best.diff) return { id: row.categoryId, diff };
    return best;
  }, null)?.id;

  const height = Math.max(data.length * 40, 120);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--color-border)" opacity={0.6} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-accent)" }} />
        <Bar dataKey="spentCents" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((row) => (
            <Cell
              key={row.categoryId}
              fill={row.categoryId === biggestIncreaseId ? "var(--color-primary)" : "var(--color-muted-foreground)"}
              fillOpacity={row.categoryId === biggestIncreaseId ? 1 : 0.5}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
