import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Period } from "@/lib/utils/date";
import { nextPeriod, MONTH_LABELS } from "@/lib/utils/date";
import { Button } from "@/components/ui/button";

function previousPeriod({ year, month }: Period): Period {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function periodHref(period: Period): string {
  return `/transactions?year=${period.year}&month=${period.month}`;
}

export function MonthNav({ period }: { period: Period }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" asChild>
        <Link href={periodHref(previousPeriod(period))} aria-label="Mois précédent">
          <ChevronLeft className="size-4" />
        </Link>
      </Button>
      <span className="w-36 text-center text-sm font-medium capitalize">
        {MONTH_LABELS[period.month - 1]} {period.year}
      </span>
      <Button variant="outline" size="icon" asChild>
        <Link href={periodHref(nextPeriod(period))} aria-label="Mois suivant">
          <ChevronRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
