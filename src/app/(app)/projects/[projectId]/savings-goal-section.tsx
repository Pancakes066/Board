"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Category } from "@prisma/client";

import type { SavingsGoalWithProgress } from "@/server/services/savings/goal-projection";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { ContributionDialog } from "@/app/(app)/savings/contribution-dialog";
import { LinkGoalDialog } from "./link-goal-dialog";

type GoalOption = { id: string; name: string; emoji: string | null };

export function SavingsGoalSection({
  projectId,
  savingsGoal,
  goalOptions,
  categories,
}: {
  projectId: string;
  savingsGoal: SavingsGoalWithProgress | null;
  goalOptions: GoalOption[];
  categories: Category[];
}) {
  const [linking, setLinking] = useState(false);
  const [contributing, setContributing] = useState(false);

  if (!savingsGoal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Épargne</CardTitle>
          <CardDescription>
            Liez ce projet à un objectif d&apos;épargne pour suivre combien vous avez déjà mis de
            côté.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setLinking(true)}>
            <Plus className="size-4" /> Lier un objectif d&apos;épargne
          </Button>
        </CardContent>
        <LinkGoalDialog
          open={linking}
          onOpenChange={setLinking}
          projectId={projectId}
          goalOptions={goalOptions}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {savingsGoal.emoji} {savingsGoal.name}
        </CardTitle>
        <CardDescription>Objectif d&apos;épargne lié à ce projet.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold tabular-nums">
              {formatCurrency(savingsGoal.currentAmountCents)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {formatCurrency(savingsGoal.targetAmountCents)}
            </span>
          </div>
          <Progress value={Math.min(savingsGoal.progressPct, 100)} className="mt-2" />
          <p className="mt-1 text-xs text-muted-foreground">{savingsGoal.progressPct}%</p>
        </div>
        {savingsGoal.suggestedMonthlyContributionCents !== null &&
          savingsGoal.suggestedMonthlyContributionCents > 0 && (
            <p className="text-sm text-muted-foreground">
              Épargnez{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(savingsGoal.suggestedMonthlyContributionCents)}
              </span>
              /mois pour l&apos;atteindre à temps.
            </p>
          )}
        <Button variant="outline" size="sm" onClick={() => setContributing(true)}>
          <Plus className="size-4" /> Ajouter une contribution
        </Button>
      </CardContent>
      <ContributionDialog
        open={contributing}
        onOpenChange={setContributing}
        goalId={savingsGoal.id}
        goalName={savingsGoal.name}
        categories={categories}
      />
    </Card>
  );
}
