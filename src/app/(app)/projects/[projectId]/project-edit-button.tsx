"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Project } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { ProjectFormDialog, type ProjectFormValues } from "@/app/(app)/projects/project-form-dialog";

export function ProjectEditButton({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);

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
      <Button variant="outline" onClick={() => setEditing(true)}>
        <Pencil className="size-4" /> Modifier
      </Button>
      <ProjectFormDialog open={editing} onOpenChange={setEditing} project={formValues} />
    </>
  );
}
