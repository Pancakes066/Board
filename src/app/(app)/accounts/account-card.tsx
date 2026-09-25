"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import type { FinancialAccountWithBalance } from "@/server/services/accounts/accounts";
import { deleteAccountAction } from "@/server/actions/accounts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyIn } from "@/lib/utils/currency";
import { ACCOUNT_TYPE_LABELS } from "./account-type-labels";
import { AccountFormDialog } from "./account-form-dialog";

export function AccountCard({ account }: { account: FinancialAccountWithBalance }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !confirm(
        `Supprimer le compte « ${account.name} » ? Les transactions déjà liées seront conservées, simplement détachées de ce compte.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteAccountAction(account.id);
      if (result.error) toast.error(result.error);
      else toast.success("Compte supprimé.");
    });
  }

  return (
    <>
      <Card className={!account.isActive ? "opacity-60" : undefined}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{account.name}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Modifier">
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={isPending}
                aria-label="Supprimer"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-2xl font-semibold text-primary">
            {formatCurrencyIn(account.balanceCents, account.currency)}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{ACCOUNT_TYPE_LABELS[account.type] ?? account.type}</Badge>
            {!account.isActive && <Badge variant="secondary">Inactif</Badge>}
          </div>
          {account.description && (
            <p className="text-sm text-muted-foreground">{account.description}</p>
          )}
        </CardContent>
      </Card>
      <AccountFormDialog
        open={editing}
        onOpenChange={setEditing}
        account={{
          id: account.id,
          name: account.name,
          type: account.type,
          currency: account.currency,
          description: account.description,
          isActive: account.isActive,
        }}
      />
    </>
  );
}
