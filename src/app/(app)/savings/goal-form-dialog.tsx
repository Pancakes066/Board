"use client";

import { useActionState, useEffect } from "react";

import {
  createSavingsGoalAction,
  updateSavingsGoalAction,
  type SavingsGoalActionState,
} from "@/server/actions/savings-goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export type GoalFormValues = {
  id: string;
  name: string;
  emoji: string | null;
  targetAmountCents: number;
  initialAmountCents: number;
  targetDate: Date | null;
};

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function GoalForm({
  goal,
  onSuccess,
  onCancel,
}: {
  goal?: GoalFormValues;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(goal);
  const action = isEdit ? updateSavingsGoalAction.bind(null, goal!.id) : createSavingsGoalAction;
  const [state, formAction, pending] = useActionState<SavingsGoalActionState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state && !state.error) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex w-20 flex-col gap-1.5">
          <Label htmlFor="emoji">Emoji</Label>
          <Input id="emoji" name="emoji" defaultValue={goal?.emoji ?? ""} placeholder="🎮" maxLength={8} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" name="name" defaultValue={goal?.name ?? ""} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetAmount">Montant cible (€)</Label>
          <Input
            id="targetAmount"
            name="targetAmount"
            inputMode="decimal"
            placeholder="1200,00"
            defaultValue={goal ? (goal.targetAmountCents / 100).toFixed(2) : ""}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="initialAmount">Déjà épargné avant de commencer (€)</Label>
          <Input
            id="initialAmount"
            name="initialAmount"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={goal ? (goal.initialAmountCents / 100).toFixed(2) : ""}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="targetDate">Date cible (optionnel)</Label>
        <Input id="targetDate" name="targetDate" type="date" defaultValue={toDateInputValue(goal?.targetDate ?? null)} />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function GoalFormDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalFormValues;
}) {
  const isEdit = Boolean(goal);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'objectif" : "Nouvel objectif d'épargne"}</DialogTitle>
          <DialogDescription>Combien voulez-vous mettre de côté, et pour quand ?</DialogDescription>
        </DialogHeader>
        {open && (
          <GoalForm key={goal?.id ?? "create"} goal={goal} onSuccess={() => onOpenChange(false)} onCancel={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
