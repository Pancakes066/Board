"use client";

import { useActionState, useEffect } from "react";
import type { Category } from "@prisma/client";

import { addContributionAction, type SavingsGoalActionState } from "@/server/actions/savings-goals";
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

function ContributionForm({
  goalId,
  categories,
  onSuccess,
  onCancel,
}: {
  goalId: string;
  categories: Category[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<SavingsGoalActionState, FormData>(
    addContributionAction.bind(null, goalId),
    undefined,
  );

  useEffect(() => {
    if (state && !state.error) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Montant (€)</Label>
          <Input id="amount" name="amount" inputMode="decimal" placeholder="50,00" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="categoryId">Catégorie</Label>
        <Select name="categoryId">
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
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ContributionDialog({
  open,
  onOpenChange,
  goalId,
  goalName,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalName: string;
  categories: Category[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une contribution</DialogTitle>
          <DialogDescription>Pour « {goalName} ».</DialogDescription>
        </DialogHeader>
        {open && (
          <ContributionForm
            goalId={goalId}
            categories={categories}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
