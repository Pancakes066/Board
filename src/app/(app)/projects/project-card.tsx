"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import type { ProjectWithProgress } from "@/server/services/projects/projects";
import { deleteProjectAction } from "@/server/actions/projects";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { ProjectFormDialog, type ProjectFormValues } from "./project-form-dialog";

const TYPE_EMOJI: Record<string, string> = {
  TRAVEL: "✈️",
  PURCHASE: "🛍️",
  EVENT: "🎉",
  MOVING: "📦",
  OTHER: "📁",
};

export function ProjectCard({ project }: { project: ProjectWithProgress }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const savedCents = project.savingsGoal?.currentAmountCents ?? 0;
  const targetCents = project.estimatedAmountCents;
  const progressPct = targetCents > 0 ? Math.min(Math.round((savedCents / targetCents) * 100), 100) : 0;

  function handleDelete() {
    if (!confirm(`Supprimer le projet « ${project.name} » ? Ses dépenses et transactions liées seront aussi supprimées.`))
      return;
    startTransition(async () => {
      const result = await deleteProjectAction(project.id);
      if (result.error) toast.error(result.error);
      else toast.success("Projet supprimé.");
    });
  }

  const formValues: ProjectFormValues = {
    id: project.id,
    type: project.type,
    name: project.name,
    emoji: project.emoji,
    description: project.description,
    estimatedAmountCents: project.estimatedAmountCents,
    currency: project.currency,
    targetDate: project.targetDate,
    deadlineDate: project.deadlineDate,
    budgetSafetyMarginPct: project.budgetSafetyMarginPct,
    fxSafetyMarginPct: project.fxSafetyMarginPct,
    destination: project.destination,
    travelStartDate: project.travelStartDate,
    travelEndDate: project.travelEndDate,
    travelerCount: project.travelerCount,
    notes: project.notes,
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">
              {project.emoji ?? TYPE_EMOJI[project.type]} {project.name}
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
              <span className="text-2xl font-semibold tabular-nums">{formatCurrency(savedCents)}</span>
              <span className="text-sm text-muted-foreground">/ {formatCurrency(targetCents)}</span>
            </div>
            <Progress value={progressPct} className="mt-2" />
            <p className="mt-1 text-xs text-muted-foreground">{progressPct}%</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${project.id}`}>Voir le détail</Link>
          </Button>
        </CardContent>
      </Card>
      <ProjectFormDialog open={editing} onOpenChange={setEditing} project={formValues} />
    </>
  );
}
