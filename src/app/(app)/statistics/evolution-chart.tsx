"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

import type { MonthlyEvolutionPoint } from "@/server/services/statistics/statistics";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/currency";

const SERIES = [
  { key: "incomeCents", label: "Revenus", color: "var(--color-chart-1)" },
  { key: "expenseCents", label: "Dépenses", color: "var(--color-chart-2)" },
  { key: "savingsCents", label: "Épargne", color: "var(--color-chart-3)" },
] as const;

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {SERIES.map((s) => {
        const entry = payload.find((p) => p.dataKey === s.key);
        if (!entry) return null;
        return (
          <p key={s.key} className="flex items-center gap-1.5 tabular-nums">
            <span className="inline-block size-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}: {formatCurrency(entry.value)}
          </p>
        );
      })}
    </div>
  );
}

/** Three parallel measures over time -> distinct series to tell apart, so
 * categorical color + a legend (within the "1-3 series" comfort band —
 * color alone plus the legend is enough, no forced direct-labeling). */
export function EvolutionChart({ points }: { points: MonthlyEvolutionPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" opacity={0.6} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          axisLine={{ stroke: "var(--color-border)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompactCurrency}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border)" }} />
        <Legend
          formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
          iconType="line"
          iconSize={16}
        />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
            activeDot={{ r: 4, stroke: "var(--color-card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
