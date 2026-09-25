"use client";

import { useActionState, useEffect } from "react";

import {
  createProjectExpenseAction,
  updateProjectExpenseAction,
  type ProjectExpenseActionState,
} from "@/server/actions/project-expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/constants/currencies";

export type ProjectExpenseFormValues = {
  id: string;
  label: string;
  emoji: string | null;
  amountCents: number;
  currency: string;
  plannedDate: Date | null;
  note: string | null;
};

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function ExpenseForm({
  projectId,
  expense,
  onSuccess,
  onCancel,
}: {
  projectId: string;
  expense?: ProjectExpenseFormValues;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(expense);
  const action = isEdit
    ? updateProjectExpenseAction.bind(null, projectId, expense!.id)
    : createProjectExpenseAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState<ProjectExpenseActionState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state && !state.error) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="emoji">Emoji</Label>
          <Input
            id="emoji"
            name="emoji"
            defaultValue={expense?.emoji ?? ""}
            placeholder="✈️"
            maxLength={8}
            className="w-20"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="label">Poste de dépense</Label>
          <Input
            id="label"
            name="label"
            placeholder="Transport"
            defaultValue={expense?.label ?? ""}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Montant</Label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="900,00"
            defaultValue={expense ? (expense.amountCents / 100).toFixed(2) : ""}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency">Devise</Label>
          <Select name="currency" defaultValue={expense?.currency ?? DEFAULT_CURRENCY}>
            <SelectTrigger id="currency" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="plannedDate">Date prévue (optionnel)</Label>
        <Input
          id="plannedDate"
          name="plannedDate"
          type="date"
          defaultValue={toDateInputValue(expense?.plannedDate)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Note (optionnel)</Label>
        <Input id="note" name="note" defaultValue={expense?.note ?? ""} maxLength={500} />
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

export function ExpenseFormDialog({
  open,
  onOpenChange,
  projectId,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  expense?: ProjectExpenseFormValues;
}) {
  const isEdit = Boolean(expense);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le poste" : "Nouveau poste de dépense"}</DialogTitle>
          <DialogDescription>
            Le montant peut être saisi dans une devise étrangère — la conversion est calculée
            automatiquement.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ExpenseForm
            key={expense?.id ?? "create"}
            projectId={projectId}
            expense={expense}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
