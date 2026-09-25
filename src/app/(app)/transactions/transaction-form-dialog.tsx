"use client";

import { useActionState, useEffect } from "react";
import type { Category, FlowType, OccurrenceStatus } from "@prisma/client";

import {
  createManualTransactionAction,
  updateManualTransactionAction,
  updateOccurrenceAction,
  type TransactionActionState,
} from "@/server/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export type TransactionFormValues = {
  id: string;
  type: FlowType;
  amountCents: number;
  categoryId: string;
  accountId?: string | null;
  date: Date;
  status: OccurrenceStatus;
  notes: string | null;
  recurringRuleId: string | null;
  ruleName?: string;
};

export type AccountOption = { id: string; name: string };

const TYPE_LABEL: Record<FlowType, string> = {
  INCOME: "Revenu",
  EXPENSE: "Dépense",
  SAVINGS: "Épargne",
};

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function TransactionForm({
  categories,
  accounts,
  transaction,
  onSuccess,
  onCancel,
}: {
  categories: Category[];
  accounts: AccountOption[];
  transaction?: TransactionFormValues;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isOccurrence = Boolean(transaction?.recurringRuleId);
  const isEdit = Boolean(transaction);

  const action = !isEdit
    ? createManualTransactionAction
    : isOccurrence
      ? updateOccurrenceAction.bind(null, transaction!.id)
      : updateManualTransactionAction.bind(null, transaction!.id);

  const [state, formAction, pending] = useActionState<TransactionActionState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state && !state.error) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isOccurrence ? (
        <div className="flex items-center gap-2">
          <Badge>{TYPE_LABEL[transaction!.type]}</Badge>
          <span className="text-sm text-muted-foreground">
            Occurrence de « {transaction!.ruleName} » — le type ne peut pas changer ici.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue={transaction?.type ?? "EXPENSE"}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Revenu</SelectItem>
                <SelectItem value="EXPENSE">Dépense</SelectItem>
                <SelectItem value="SAVINGS">Épargne</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Statut</Label>
            <Select name="status" defaultValue={transaction?.status ?? "COMPLETED"}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPLETED">Effectuée</SelectItem>
                <SelectItem value="PLANNED">Prévue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Montant (€)</Label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="20,00"
            defaultValue={transaction ? (transaction.amountCents / 100).toFixed(2) : ""}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={toDateInputValue(transaction?.date ?? new Date())}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="categoryId">Catégorie</Label>
        <Select name="categoryId" defaultValue={transaction?.categoryId}>
          <SelectTrigger id="categoryId" className="w-full">
            <SelectValue placeholder="Choisir une catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {accounts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="accountId">Compte (optionnel)</Label>
          <Select name="accountId" defaultValue={transaction?.accountId ?? "__none__"}>
            <SelectTrigger id="accountId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Aucun compte spécifique</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Note (optionnel)</Label>
        <Input id="notes" name="notes" defaultValue={transaction?.notes ?? ""} maxLength={200} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  categories,
  accounts = [],
  transaction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  accounts?: AccountOption[];
  transaction?: TransactionFormValues;
}) {
  const isEdit = Boolean(transaction);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la transaction" : "Nouvelle transaction manuelle"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cette modification ne concerne que cette occurrence."
              : "Pour une dépense ou un revenu ponctuel, hors règle récurrente."}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <TransactionForm
            key={transaction?.id ?? "create"}
            categories={categories}
            accounts={accounts}
            transaction={transaction}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
