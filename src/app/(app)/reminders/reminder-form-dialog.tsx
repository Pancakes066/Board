"use client";

import { useActionState, useEffect, useState } from "react";
import type { ReminderFrequency } from "@prisma/client";

import {
  createReminderAction,
  updateReminderAction,
  type ReminderActionState,
} from "@/server/actions/reminders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { WEEKDAY_LABELS, MONTH_LABELS } from "@/lib/utils/date";

export type LinkOptions = {
  categories: { id: string; name: string; emoji: string | null }[];
  recurringRules: { id: string; name: string }[];
  budgets: { id: string; category: { name: string; emoji: string | null } }[];
  savingsGoals: { id: string; name: string }[];
  projects: { id: string; name: string }[];
};

export type ReminderFormValues = {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  hour: number;
  minute: number;
  frequency: ReminderFrequency;
  dayOfMonth: number | null;
  month: number | null;
  dayOfWeek: number | null;
  intervalDays: number | null;
  endDate: Date | null;
  categoryId: string | null;
  recurringRuleId: string | null;
  budgetId: string | null;
  savingsGoalId: string | null;
  projectId: string | null;
};

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

const FREQUENCY_LABEL: Record<ReminderFrequency, string> = {
  ONCE: "Une seule fois",
  DAILY: "Tous les jours",
  WEEKLY: "Toutes les semaines",
  MONTHLY: "Tous les mois",
  YEARLY: "Tous les ans",
  CUSTOM: "Personnalisé",
};

function ReminderForm({
  reminder,
  linkOptions,
  onSuccess,
  onCancel,
}: {
  reminder?: ReminderFormValues;
  linkOptions: LinkOptions;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(reminder);
  const action = isEdit ? updateReminderAction.bind(null, reminder!.id) : createReminderAction;
  const [state, formAction, pending] = useActionState<ReminderActionState, FormData>(
    action,
    undefined,
  );
  const [frequency, setFrequency] = useState<ReminderFrequency>(reminder?.frequency ?? "ONCE");

  useEffect(() => {
    if (state && !state.error) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const hasLinkOptions =
    linkOptions.categories.length > 0 ||
    linkOptions.recurringRules.length > 0 ||
    linkOptions.budgets.length > 0 ||
    linkOptions.savingsGoals.length > 0 ||
    linkOptions.projects.length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" defaultValue={reminder?.title ?? ""} placeholder="Payer l'assurance" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optionnel)</Label>
        <Textarea id="description" name="description" defaultValue={reminder?.description ?? ""} rows={2} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={toDateInputValue(reminder?.date) || toDateInputValue(new Date())}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hour">Heure</Label>
          <Input id="hour" name="hour" type="number" min={0} max={23} defaultValue={reminder?.hour ?? 9} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="minute">Minutes</Label>
          <Input id="minute" name="minute" type="number" min={0} max={59} defaultValue={reminder?.minute ?? 0} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="frequency">Répétition</Label>
        <Select name="frequency" value={frequency} onValueChange={(v) => setFrequency(v as ReminderFrequency)}>
          <SelectTrigger id="frequency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(FREQUENCY_LABEL) as [ReminderFrequency, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
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
              defaultValue={reminder?.dayOfMonth ?? undefined}
              required
            />
          </div>
          {frequency === "YEARLY" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="month">Mois</Label>
              <Select name="month" defaultValue={reminder?.month ? String(reminder.month) : undefined}>
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
          <Select name="dayOfWeek" defaultValue={reminder?.dayOfWeek !== null ? String(reminder?.dayOfWeek) : undefined}>
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

      {frequency === "CUSTOM" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="intervalDays">Tous les combien de jours ?</Label>
          <Input
            id="intervalDays"
            name="intervalDays"
            type="number"
            min={1}
            placeholder="12"
            defaultValue={reminder?.intervalDays ?? undefined}
            required
          />
        </div>
      )}

      {frequency !== "ONCE" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endDate">Date de fin (optionnel)</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={toDateInputValue(reminder?.endDate)} />
        </div>
      )}

      {hasLinkOptions && (
        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">
            Lier ce rappel à un élément existant (optionnel) — cela ne crée jamais de transaction
            automatiquement.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {linkOptions.categories.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="categoryId">Catégorie</Label>
                <Select name="categoryId" defaultValue={reminder?.categoryId ?? "__none__"}>
                  <SelectTrigger id="categoryId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune</SelectItem>
                    {linkOptions.categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {linkOptions.recurringRules.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="recurringRuleId">Revenu/dépense récurrent</Label>
                <Select name="recurringRuleId" defaultValue={reminder?.recurringRuleId ?? "__none__"}>
                  <SelectTrigger id="recurringRuleId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {linkOptions.recurringRules.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {linkOptions.budgets.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="budgetId">Budget</Label>
                <Select name="budgetId" defaultValue={reminder?.budgetId ?? "__none__"}>
                  <SelectTrigger id="budgetId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {linkOptions.budgets.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.category.emoji} {b.category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {linkOptions.savingsGoals.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="savingsGoalId">Objectif d&apos;épargne</Label>
                <Select name="savingsGoalId" defaultValue={reminder?.savingsGoalId ?? "__none__"}>
                  <SelectTrigger id="savingsGoalId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {linkOptions.savingsGoals.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {linkOptions.projects.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="projectId">Projet</Label>
                <Select name="projectId" defaultValue={reminder?.projectId ?? "__none__"}>
                  <SelectTrigger id="projectId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun</SelectItem>
                    {linkOptions.projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
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

export function ReminderFormDialog({
  open,
  onOpenChange,
  reminder,
  linkOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder?: ReminderFormValues;
  linkOptions: LinkOptions;
}) {
  const isEdit = Boolean(reminder);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le rappel" : "Nouveau rappel"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajustez la date, l'heure ou la répétition."
              : "Programmez un rappel — jamais lié automatiquement à une transaction."}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ReminderForm
            key={reminder?.id ?? "create"}
            reminder={reminder}
            linkOptions={linkOptions}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
