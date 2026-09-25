"use client";

import { useState } from "react";
import { Plus, Wallet, ArrowRightLeft, Trash2 } from "lucide-react";

import type { FinancialAccountWithBalance } from "@/server/services/accounts/accounts";
import { deleteTransferAction } from "@/server/actions/accounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyIn } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { AccountCard } from "./account-card";
import { AccountFormDialog } from "./account-form-dialog";
import { TransferDialog } from "./transfer-dialog";
import { toast } from "sonner";

type Transfer = {
  id: string;
  amountCents: number;
  date: Date;
  note: string | null;
  fromAccount: { id: string; name: string; currency: string };
  toAccount: { id: string; name: string; currency: string };
};

export function AccountsList({
  accounts,
  totals,
  transfers,
}: {
  accounts: FinancialAccountWithBalance[];
  totals: { currency: string; totalCents: number }[];
  transfers: Transfer[];
}) {
  const [creating, setCreating] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const activeAccounts = accounts.filter((a) => a.isActive);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => setTransferring(true)}>
          <ArrowRightLeft className="size-4" /> Transférer
        </Button>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Nouveau compte
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Wallet className="size-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucun compte pour l&apos;instant.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-6">
              {totals.map((t) => (
                <p key={t.currency} className="text-2xl font-semibold text-primary">
                  {formatCurrencyIn(t.totalCents, t.currency)}
                </p>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </>
      )}

      {transfers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des transferts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {transfers.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {t.fromAccount.name} → {t.toAccount.name}
                  {t.note ? ` · ${t.note}` : ""}
                  <span className="ml-2 text-muted-foreground">{formatDate(t.date)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatCurrencyIn(t.amountCents, t.fromAccount.currency)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer"
                    onClick={async () => {
                      if (!confirm("Supprimer ce transfert ?")) return;
                      const result = await deleteTransferAction(t.id);
                      if (result.error) toast.error(result.error);
                      else toast.success("Transfert supprimé.");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AccountFormDialog open={creating} onOpenChange={setCreating} />
      <TransferDialog
        open={transferring}
        onOpenChange={setTransferring}
        accounts={activeAccounts}
      />
    </div>
  );
}
