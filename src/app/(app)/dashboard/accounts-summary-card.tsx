import Link from "next/link";

import type { FinancialAccountWithBalance } from "@/server/services/accounts/accounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyIn } from "@/lib/utils/currency";

/** Deliberately small and additive — just enough to see accounts exist
 * and their total, without duplicating the "argent réellement disponible"
 * tile above (that number comes from getForecast, untouched by this
 * card). Full management lives on /accounts. */
export function AccountsSummaryCard({
  accounts,
  totals,
}: {
  accounts: FinancialAccountWithBalance[];
  totals: { currency: string; totalCents: number }[];
}) {
  const activeAccounts = accounts.filter((a) => a.isActive);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Mes comptes</CardTitle>
          <Link href="/accounts" className="text-sm text-muted-foreground hover:text-foreground">
            Voir tout →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {activeAccounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between text-sm">
            <span>{account.name}</span>
            <span className="font-medium">
              {formatCurrencyIn(account.balanceCents, account.currency)}
            </span>
          </div>
        ))}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="flex gap-3">
            {totals.map((t) => (
              <span key={t.currency} className="font-semibold text-primary">
                {formatCurrencyIn(t.totalCents, t.currency)}
              </span>
            ))}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
