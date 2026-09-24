"use client";

import { useActionState, useEffect, useState } from "react";
import type { Category, FlowType, RecurrenceFrequency } from "@prisma/client";

import {
  createRecurringRuleAction,
  updateRecurringRuleAction,
  type RecurringRuleActionState,
} from "@/server/actions/recurring-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { WEEKDAY_LABELS, MONTH_LABELS } from "@/lib/utils/date";

type SavingsGoalOption = { id: string; name: string; emoji: string | null };

type RuleFormValues = {
  id: string;
  type: FlowType;
  name: string;
  amountCents: number;
  frequency: RecurrenceFrequency;
  dayOfMonth: number | null;
  month: number | null;
  dayOfWeek: number | null;
  categoryId: string;
  savingsGoalId: string | null;
  startDate: Date;
  endDate: Date | null;
  isSubscription: boolean;
};

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function RecurringRuleForm({
  categories,
  savingsGoals,
  rule,
  onSuccess,
  onCancel,
}: {
  categories: Category[];
  savingsGoals: SavingsGoalOption[];
  rule?: RuleFormValues;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(rule);
  const action = isEdit
    ? updateRecurringRuleAction.bind(null, rule!.id)
    : createRecurringRuleAction;
  const [state, formAction, pending] = useActionState<RecurringRuleActionState, FormData>(
    action,
    undefined,
  );

  const [type, setType] = useState<FlowType>(rule?.type ?? "EXPENSE");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(rule?.frequency ?? "MONTHLY");

  useEffect(() => {
    if (state && !state.error) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <Select name="type" value={type} onValueChange={(v) => setType(v as FlowType)}>
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
          <Label htmlFor="amount">Montant (€)</Label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="20,00"
            defaultValue={rule ? (rule.amountCents / 100).toFixed(2) : ""}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" name="name" defaultValue={rule?.name ?? ""} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="categoryId">Catégorie</Label>
        <Select name="categoryId" defaultValue={rule?.categoryId}>
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

      {type === "SAVINGS" && savingsGoals.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="savingsGoalId">Objectif d&apos;épargne (optionnel)</Label>
          <Select name="savingsGoalId" defaultValue={rule?.savingsGoalId ?? "none"}>
            <SelectTrigger id="savingsGoalId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {savingsGoals.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.emoji} {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="frequency">Fréquence</Label>
        <Select
          name="frequency"
          value={frequency}
          onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}
        >
          <SelectTrigger id="frequency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MONTHLY">Mensuelle</SelectItem>
            <SelectItem value="WEEKLY">Hebdomadaire</SelectItem>
            <SelectItem value="YEARLY">Annuelle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(frequency === "MONTHLY" || frequency === "YEARLY") && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dayOfMonth">Jour du mois</Label>
            <Input
              id="dayOfMonth"
              name="dayOfMonth"
              type="number"
              min={1}
              max={31}
              defaultValue={rule?.dayOfMonth ?? undefined}
              required
            />
          </div>
          {frequency === "YEARLY" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="month">Mois</Label>
              <Select name="month" defaultValue={rule?.month ? String(rule.month) : undefined}>
                <SelectTrigger id="month" className="w-full">
                  <SelectValue placeholder="Mois" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_LABELS.map((label, i) => (
                    <SelectItem key={label} value={String(i + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {frequency === "WEEKLY" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dayOfWeek">Jour de la semaine</Label>
          <Select
            name="dayOfWeek"
            defaultValue={rule?.dayOfWeek !== null ? String(rule?.dayOfWeek) : undefined}
          >
            <SelectTrigger id="dayOfWeek" className="w-full">
              <SelectValue placeholder="Jour" />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAY_LABELS.map((label, i) => (
                <SelectItem key={label} value={String(i)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">Date de début</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(rule?.startDate) || toDateInputValue(new Date())}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endDate">Date de fin (optionnel)</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={toDateInputValue(rule?.endDate)} />
        </div>
      </div>

      {type === "EXPENSE" && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="isSubscription" defaultChecked={rule?.isSubscription} />
          C&apos;est un abonnement
        </label>
      )}

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

export function RecurringRuleFormDialog({
  open,
  onOpenChange,
  categories,
  savingsGoals,
  rule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  savingsGoals: SavingsGoalOption[];
  rule?: RuleFormValues;
}) {
  const isEdit = Boolean(rule);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la règle" : "Nouveau revenu ou dépense récurrent"}</DialogTitle>
          <DialogDescription>
            Configurez-la une fois : elle se génère ensuite automatiquement chaque mois.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RecurringRuleForm
            key={rule?.id ?? "create"}
            categories={categories}
            savingsGoals={savingsGoals}
            rule={rule}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
