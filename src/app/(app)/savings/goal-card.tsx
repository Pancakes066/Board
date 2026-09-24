"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Category } from "@prisma/client";

import type { SavingsGoalWithProgress } from "@/server/services/savings/goal-projection";
import { deleteSavingsGoalAction } from "@/server/actions/savings-goals";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { GoalFormDialog, type GoalFormValues } from "./goal-form-dialog";
import { ContributionDialog } from "./contribution-dialog";

export function GoalCard({
  goal,
  categories,
}: {
  goal: SavingsGoalWithProgress;
  categories: Category[];
}) {
  const [editing, setEditing] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Supprimer l'objectif « ${goal.name} » ? L'historique de contributions est conservé.`))
      return;
    startTransition(async () => {
      const result = await deleteSavingsGoalAction(goal.id);
      if (result.error) toast.error(result.error);
      else toast.success("Objectif supprimé.");
    });
  }

  const formValues: GoalFormValues = {
    id: goal.id,
    name: goal.name,
    emoji: goal.emoji,
    targetAmountCents: goal.targetAmountCents,
    initialAmountCents: goal.initialAmountCents,
    targetDate: goal.targetDate,
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">
              {goal.emoji} {goal.name}
            </CardTitle>
            <div className="flex gap-1">
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
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold tabular-nums">
                {formatCurrency(goal.currentAmountCents)}
              </span>
              <span className="text-sm text-muted-foreground">
                / {formatCurrency(goal.targetAmountCents)}
              </span>
            </div>
            <Progress value={Math.min(goal.progressPct, 100)} className="mt-2" />
            <p className="mt-1 text-xs text-muted-foreground">{goal.progressPct}%</p>
          </div>

          {goal.targetDate && (
            <p className="text-sm text-muted-foreground">
              Objectif : {formatDate(goal.targetDate)}
              {goal.suggestedMonthlyContributionCents !== null &&
                goal.suggestedMonthlyContributionCents > 0 && (
                  <>
                    {" "}
                    — épargnez{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(goal.suggestedMonthlyContributionCents)}
                    </span>
                    /mois pour l&apos;atteindre à temps
                  </>
                )}
            </p>
          )}

          <Button variant="outline" size="sm" onClick={() => setContributing(true)}>
            <Plus className="size-4" /> Ajouter une contribution
          </Button>
        </CardContent>
      </Card>
      <GoalFormDialog open={editing} onOpenChange={setEditing} goal={formValues} />
      <ContributionDialog
        open={contributing}
        onOpenChange={setContributing}
        goalId={goal.id}
        goalName={goal.name}
        categories={categories}
      />
    </>
  );
}
