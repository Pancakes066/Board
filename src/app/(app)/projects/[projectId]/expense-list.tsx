"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookmarkPlus, CheckCircle2, Undo2, Receipt } from "lucide-react";
import type { ProjectExpense, Transaction } from "@prisma/client";

import {
  deleteProjectExpenseAction,
  reserveExpenseAction,
  markExpensePaidAction,
  unreserveExpenseAction,
} from "@/server/actions/project-expenses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatCurrencyIn } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { ExpenseFormDialog, type ProjectExpenseFormValues } from "./expense-form-dialog";

type ExpenseWithTransaction = ProjectExpense & { transaction: Transaction | null };

function ExpenseRow({ projectId, expense }: { projectId: string; expense: ExpenseWithTransaction }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const homeCents =
    expense.currency === "EUR" ? expense.amountCents : (expense.convertedAmountCents ?? null);

  function run(action: () => Promise<{ error?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else toast.success(successMsg);
    });
  }

  function handleDelete() {
    if (!confirm(`Supprimer le poste « ${expense.label} » ?`)) return;
    run(() => deleteProjectExpenseAction(projectId, expense.id), "Poste supprimé.");
  }

  const formValues: ProjectExpenseFormValues = {
    id: expense.id,
    label: expense.label,
    emoji: expense.emoji,
    amountCents: expense.amountCents,
    currency: expense.currency,
    plannedDate: expense.plannedDate,
    note: expense.note,
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {expense.emoji} {expense.label}
            </span>
            {expense.transaction?.status === "COMPLETED" ? (
              <Badge variant="positive">✅ Payée</Badge>
            ) : expense.transaction?.status === "PLANNED" ? (
              <Badge variant="secondary">⏳ Réservée</Badge>
            ) : (
              <Badge variant="outline">Estimation</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatCurrencyIn(expense.amountCents, expense.currency)}
            {expense.currency !== "EUR" && (
              <>
                {" "}
                ≈{" "}
                {homeCents !== null ? (
                  formatCurrency(homeCents)
                ) : (
                  <span className="italic">conversion indisponible</span>
                )}
                {expense.exchangeRate && expense.convertedAt && (
                  <span className="ml-1 text-xs">
                    (taux : 1 EUR = {expense.exchangeRate.toFixed(2)} {expense.currency}, estimation
                    basée sur le taux du {formatDate(expense.convertedAt)})
                  </span>
                )}
              </>
            )}
            {expense.plannedDate && <> — {formatDate(expense.plannedDate)}</>}
          </p>
          {expense.note && <p className="text-xs text-muted-foreground">{expense.note}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {!expense.transaction && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => run(() => reserveExpenseAction(projectId, expense.id), "Dépense réservée.")}
              >
                <BookmarkPlus className="size-3.5" /> Réserver
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run(() => markExpensePaidAction(projectId, expense.id), "Marquée payée.")
                }
              >
                <CheckCircle2 className="size-3.5" /> Marquer payé
              </Button>
            </>
          )}
          {expense.transaction?.status === "PLANNED" && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run(() => markExpensePaidAction(projectId, expense.id), "Marquée payée.")
                }
              >
                <CheckCircle2 className="size-3.5" /> Marquer payé
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run(() => unreserveExpenseAction(projectId, expense.id), "Réservation annulée.")
                }
              >
                <Undo2 className="size-3.5" /> Annuler
              </Button>
            </>
          )}
          {expense.transaction?.status === "COMPLETED" && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() =>
                run(() => unreserveExpenseAction(projectId, expense.id), "Paiement annulé.")
              }
            >
              <Undo2 className="size-3.5" /> Annuler le paiement
            </Button>
          )}
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
      <ExpenseFormDialog
        open={editing}
        onOpenChange={setEditing}
        projectId={projectId}
        expense={formValues}
      />
    </>
  );
}

export function ExpenseList({
  projectId,
  expenses,
}: {
  projectId: string;
  expenses: ExpenseWithTransaction[];
}) {
  const [creating, setCreating] = useState(false);
  const total = expenses.reduce(
    (sum, e) => sum + (e.currency === "EUR" ? e.amountCents : (e.convertedAmountCents ?? 0)),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Budget du projet</CardTitle>
            <CardDescription>Postes de dépense, triés par date prévue.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Ajouter un poste
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Receipt className="size-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucun poste de dépense pour l&apos;instant.</p>
          </div>
        ) : (
          <>
            {expenses.map((expense) => (
              <ExpenseRow key={expense.id} projectId={projectId} expense={expense} />
            ))}
            <div className="flex items-center justify-between pt-3 font-medium">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </>
        )}
      </CardContent>
      <ExpenseFormDialog open={creating} onOpenChange={setCreating} projectId={projectId} />
    </Card>
  );
}
