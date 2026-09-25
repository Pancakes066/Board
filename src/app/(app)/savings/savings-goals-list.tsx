"use client";

import { useState } from "react";
import type { Category } from "@prisma/client";
import { Plus, Target } from "lucide-react";

import type { SavingsGoalWithProgress } from "@/server/services/savings/goal-projection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoalCard } from "./goal-card";
import { GoalFormDialog } from "./goal-form-dialog";

type AccountOption = { id: string; name: string };

export function SavingsGoalsList({
  goals,
  categories,
  accounts = [],
}: {
  goals: SavingsGoalWithProgress[];
  categories: Category[];
  accounts?: AccountOption[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Nouvel objectif
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Target className="size-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Aucun objectif d&apos;épargne pour l&apos;instant.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} categories={categories} accounts={accounts} />
          ))}
        </div>
      )}

      <GoalFormDialog open={creating} onOpenChange={setCreating} accounts={accounts} />
    </div>
  );
}
