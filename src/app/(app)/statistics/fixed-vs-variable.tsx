import { formatCurrency } from "@/lib/utils/currency";
import type { FixedVsVariable as FixedVsVariableData } from "@/server/services/statistics/statistics";

export function FixedVsVariable({ data }: { data: FixedVsVariableData }) {
  const total = data.fixedCents + data.variableCents;
  const fixedPct = total > 0 ? Math.round((data.fixedCents / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {total > 0 && (
          <>
            <div className="h-full bg-[var(--color-chart-1)]" style={{ width: `${fixedPct}%` }} />
            <div className="h-full bg-[var(--color-chart-2)]" style={{ width: `${100 - fixedPct}%` }} />
          </>
        )}
      </div>
      <div className="flex justify-between text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-[var(--color-chart-1)]" />
          Fixes — {formatCurrency(data.fixedCents)} ({fixedPct}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-[var(--color-chart-2)]" />
          Variables — {formatCurrency(data.variableCents)} ({100 - fixedPct}%)
        </span>
      </div>
    </div>
  );
}
