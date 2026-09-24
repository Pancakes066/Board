"use client";

import { useActionState, useEffect } from "react";
import type { Category } from "@prisma/client";

import { setBudgetAction, type BudgetActionState } from "@/server/actions/budgets";
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

export type BudgetFormValues = { categoryId: string; categoryName: string; capCents: number };

function BudgetForm({
  categories,
  existing,
  onSuccess,
  onCancel,
}: {
  categories: Category[];
  existing?: BudgetFormValues;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<BudgetActionState, FormData>(
    setBudgetAction,
    undefined,
  );

  useEffect(() => {
    if (state && !state.error) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="categoryId">Catégorie</Label>
        {existing ? (
          <>
            <input type="hidden" name="categoryId" value={existing.categoryId} />
            <Input disabled value={existing.categoryName} />
          </>
        ) : (
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
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount">Plafond mensuel (€)</Label>
        <Input
          id="amount"
          name="amount"
          inputMode="decimal"
          placeholder="200,00"
          defaultValue={existing ? (existing.capCents / 100).toFixed(2) : ""}
          required
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : existing ? "Enregistrer" : "Créer"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function BudgetFormDialog({
  open,
  onOpenChange,
  categories,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  existing?: BudgetFormValues;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Modifier le budget" : "Nouveau budget"}</DialogTitle>
          <DialogDescription>Un plafond mensuel pour cette catégorie.</DialogDescription>
        </DialogHeader>
        {open && (
          <BudgetForm
            key={existing?.categoryId ?? "create"}
            categories={categories}
            existing={existing}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
