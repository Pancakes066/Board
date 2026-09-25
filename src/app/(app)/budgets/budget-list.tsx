"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import type { Category } from "@prisma/client";

import type { BudgetWithProgress } from "@/server/services/budgets/budget-progress";
import { deleteBudgetAction } from "@/server/actions/budgets";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { BudgetFormDialog, type BudgetFormValues } from "./budget-form-dialog";

/** Severity ramp within one hue family (see the dataviz pass on the
 * dashboard): under 75% reads as fine (positive), 75-99% a muted red
 * ("amber" per the plan's own 200€-cap/150€-spent/75% worked example),
 * 100%+ full red — an ordinal signal, not three unrelated hues. */
function severityClass(pct: number): string {
  if (pct >= 100) return "bg-destructive";
  if (pct >= 75) return "bg-destructive/60";
  return "bg-positive";
}

function BudgetRow({ budget, categories }: { budget: BudgetWithProgress; categories: Category[] }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Supprimer le budget « ${budget.categoryName} » ?`)) return;
    startTransition(async () => {
      const result = await deleteBudgetAction(budget.id);
      if (result.error) toast.error(result.error);
      else toast.success("Budget supprimé.");
    });
  }

  const formValues: BudgetFormValues = {
    categoryId: budget.categoryId,
    categoryName: budget.categoryName,
    capCents: budget.capCents,
  };

  return (
    <>
      <div className="flex flex-col gap-2 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">
            {budget.categoryEmoji} {budget.categoryName}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm tabular-nums text-muted-foreground">
              {formatCurrency(budget.spentCents)} / {formatCurrency(budget.capCents)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing(true)}
              aria-label="Modifier"
            >
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
        <div className="flex items-center gap-3">
          <Progress
            value={Math.min(budget.progressPct, 100)}
            indicatorClassName={cn(severityClass(budget.progressPct))}
            className="flex-1"
          />
          <span
            className={cn(
              "w-12 shrink-0 text-right text-xs font-medium tabular-nums",
              budget.progressPct >= 100 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {budget.progressPct}%
          </span>
        </div>
      </div>
      <BudgetFormDialog
        open={editing}
        onOpenChange={setEditing}
        categories={categories}
        existing={formValues}
      />
    </>
  );
}

export function BudgetList({
  budgets,
  availableCategories,
  allCategories,
}: {
  budgets: BudgetWithProgress[];
  /** Categories without a budget yet — offered when creating a new one. */
  availableCategories: Category[];
  allCategories: Category[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)} disabled={availableCategories.length === 0}>
          <Plus className="size-4" /> Ajouter
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y divide-border">
          {budgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Wallet className="size-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Aucun budget défini pour l&apos;instant.</p>
            </div>
          ) : (
            budgets.map((b) => <BudgetRow key={b.id} budget={b} categories={allCategories} />)
          )}
        </CardContent>
      </Card>

      <BudgetFormDialog open={creating} onOpenChange={setCreating} categories={availableCategories} />
    </div>
  );
}
