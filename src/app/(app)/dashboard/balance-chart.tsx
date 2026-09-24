"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import type { BalancePoint } from "@/server/services/forecast/balance";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/currency";

function formatAxisDate(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${day}/${month}`;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: BalancePoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const [year, month, day] = point.date.split("-");

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground">
        {day}/{month}/{year}
      </p>
      <p className="font-semibold tabular-nums">{formatCurrency(point.balanceCents)}</p>
    </div>
  );
}

export function BalanceChart({ points }: { points: BalancePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--color-border)"
          strokeDasharray="0"
          opacity={0.6}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatAxisDate}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          axisLine={{ stroke: "var(--color-border)" }}
          tickLine={false}
          minTickGap={32}
        />
        <YAxis
          tickFormatter={formatCompactCurrency}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border)" }} />
        <Line
          // A running balance only changes at a transaction's moment and
          // is flat in between — stepAfter draws that honestly. "monotone"
          // would smooth a curve between two sparse points (e.g. flat for
          // months, then one transaction) into a misleading gradual rise
          // that never actually happened.
          type="stepAfter"
          dataKey="balanceCents"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: "var(--color-card)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
