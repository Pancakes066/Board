"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Bell, Pencil, Trash2, Ban, RotateCcw, Check } from "lucide-react";

import {
  deleteReminderAction,
  setReminderStatusAction,
} from "@/server/actions/reminders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils/date";
import { computeReminderOccurrenceDates } from "@/server/services/reminders/occurrence-dates";
import {
  ReminderFormDialog,
  type ReminderFormValues,
  type LinkOptions,
} from "./reminder-form-dialog";

type ReminderRow = {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  hour: number;
  minute: number;
  frequency: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
  dayOfMonth: number | null;
  month: number | null;
  dayOfWeek: number | null;
  intervalDays: number | null;
  endDate: Date | null;
  status: "ACTIVE" | "INACTIVE" | "COMPLETED";
  categoryId: string | null;
  recurringRuleId: string | null;
  budgetId: string | null;
  savingsGoalId: string | null;
  projectId: string | null;
  category: { id: string; name: string; emoji: string | null } | null;
  recurringRule: { id: string; name: string } | null;
  budget: { id: string; category: { name: string; emoji: string | null } } | null;
  savingsGoal: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
};

const FREQUENCY_LABEL: Record<ReminderRow["frequency"], string> = {
  ONCE: "Une seule fois",
  DAILY: "Tous les jours",
  WEEKLY: "Toutes les semaines",
  MONTHLY: "Tous les mois",
  YEARLY: "Tous les ans",
  CUSTOM: "Personnalisé",
};

function nextOccurrence(reminder: ReminderRow, now: Date): Date | null {
  const horizon = new Date(now.getTime() + 400 * 24 * 60 * 60 * 1000);
  const dates = computeReminderOccurrenceDates(reminder, { from: now, to: horizon });
  return dates[0] ?? null;
}

function lastOccurrence(reminder: ReminderRow, now: Date): Date | null {
  const start = new Date(reminder.date.getTime() - 24 * 60 * 60 * 1000);
  const dates = computeReminderOccurrenceDates(reminder, { from: start, to: now });
  return dates.length > 0 ? dates[dates.length - 1] : null;
}

function linkLabel(reminder: ReminderRow): string | null {
  if (reminder.recurringRule) return `↔ ${reminder.recurringRule.name}`;
  if (reminder.savingsGoal) return `↔ ${reminder.savingsGoal.name}`;
  if (reminder.budget) return `↔ Budget ${reminder.budget.category.name}`;
  if (reminder.project) return `↔ ${reminder.project.name}`;
  if (reminder.category) return `↔ ${reminder.category.name}`;
  return null;
}

function ReminderCard({
  reminder,
  linkOptions,
  now,
}: {
  reminder: ReminderRow;
  linkOptions: LinkOptions;
  now: Date;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const next = reminder.status === "ACTIVE" ? nextOccurrence(reminder, now) : null;
  const last = lastOccurrence(reminder, now);
  const timeLabel = `${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`;

  function handleDelete() {
    if (!confirm(`Supprimer le rappel « ${reminder.title} » ?`)) return;
    startTransition(async () => {
      const result = await deleteReminderAction(reminder.id);
      if (result.error) toast.error(result.error);
      else toast.success("Rappel supprimé.");
    });
  }

  function setStatus(status: "ACTIVE" | "INACTIVE" | "COMPLETED") {
    startTransition(async () => {
      const result = await setReminderStatusAction(reminder.id, status);
      if (result.error) toast.error(result.error);
    });
  }

  const formValues: ReminderFormValues = {
    id: reminder.id,
    title: reminder.title,
    description: reminder.description,
    date: reminder.date,
    hour: reminder.hour,
    minute: reminder.minute,
    frequency: reminder.frequency,
    dayOfMonth: reminder.dayOfMonth,
    month: reminder.month,
    dayOfWeek: reminder.dayOfWeek,
    intervalDays: reminder.intervalDays,
    endDate: reminder.endDate,
    categoryId: reminder.categoryId,
    recurringRuleId: reminder.recurringRuleId,
    budgetId: reminder.budgetId,
    savingsGoalId: reminder.savingsGoalId,
    projectId: reminder.projectId,
  };

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">
                🔔 {reminder.title}
              </p>
              {reminder.description && (
                <p className="text-sm text-muted-foreground">{reminder.description}</p>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Modifier">
                <Pencil className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending} aria-label="Supprimer">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{formatDate(reminder.date)} à {timeLabel}</span>
            <Badge variant="outline">{FREQUENCY_LABEL[reminder.frequency]}</Badge>
            {reminder.status === "ACTIVE" && (
              <Badge variant="positive">Actif</Badge>
            )}
            {reminder.status === "INACTIVE" && <Badge variant="secondary">Désactivé</Badge>}
            {reminder.status === "COMPLETED" && <Badge variant="secondary">Terminé</Badge>}
          </div>

          {next && (
            <p className="text-sm text-primary">Prochain : {formatDate(next)} à {timeLabel}</p>
          )}
          {!next && last && reminder.status === "ACTIVE" && (
            <p className="text-sm text-muted-foreground">Dernier passage : {formatDate(last)}</p>
          )}

          {linkLabel(reminder) && (
            <p className="text-xs text-muted-foreground">{linkLabel(reminder)}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {reminder.status !== "COMPLETED" && (
              <Button variant="outline" size="sm" onClick={() => setStatus("COMPLETED")} disabled={isPending}>
                <Check className="size-3.5" /> Marquer terminé
              </Button>
            )}
            {reminder.status === "ACTIVE" && (
              <Button variant="outline" size="sm" onClick={() => setStatus("INACTIVE")} disabled={isPending}>
                <Ban className="size-3.5" /> Désactiver
              </Button>
            )}
            {reminder.status !== "ACTIVE" && (
              <Button variant="outline" size="sm" onClick={() => setStatus("ACTIVE")} disabled={isPending}>
                <RotateCcw className="size-3.5" /> Réactiver
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <ReminderFormDialog
        open={editing}
        onOpenChange={setEditing}
        reminder={formValues}
        linkOptions={linkOptions}
      />
    </>
  );
}

const FILTERS = [
  { value: "UPCOMING", label: "À venir" },
  { value: "PAST", label: "Passés" },
  { value: "ALL", label: "Tous" },
] as const;

export function RemindersList({
  reminders,
  linkOptions,
}: {
  reminders: ReminderRow[];
  linkOptions: LinkOptions;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("UPCOMING");
  const [creating, setCreating] = useState(false);
  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return reminders;
    return reminders.filter((r) => {
      const next = r.status === "ACTIVE" ? nextOccurrence(r, now) : null;
      if (filter === "UPCOMING") return next !== null;
      return next === null;
    });
  }, [reminders, filter, now]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Nouveau rappel
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Bell className="size-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucun rappel pour ce filtre.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((r) => (
            <ReminderCard key={r.id} reminder={r} linkOptions={linkOptions} now={now} />
          ))}
        </div>
      )}

      <ReminderFormDialog open={creating} onOpenChange={setCreating} linkOptions={linkOptions} />
    </div>
  );
}
