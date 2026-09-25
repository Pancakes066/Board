"use client";

import { useActionState, useEffect, useState } from "react";
import type { ProjectType } from "@prisma/client";

import { createProjectAction, updateProjectAction, type ProjectActionState } from "@/server/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/constants/currencies";

const TYPE_LABELS: Record<ProjectType, string> = {
  TRAVEL: "✈️ Voyage",
  PURCHASE: "🛍️ Achat",
  EVENT: "🎉 Événement",
  MOVING: "📦 Déménagement",
  OTHER: "📁 Autre",
};

export type ProjectFormValues = {
  id: string;
  type: ProjectType;
  name: string;
  emoji: string | null;
  description: string | null;
  estimatedAmountCents: number;
  currency: string;
  targetDate: Date | null;
  deadlineDate: Date | null;
  budgetSafetyMarginPct: number | null;
  fxSafetyMarginPct: number | null;
  destination: string | null;
  travelStartDate: Date | null;
  travelEndDate: Date | null;
  travelerCount: number | null;
  notes: string | null;
};

function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function ProjectForm({
  project,
  onSuccess,
  onCancel,
}: {
  project?: ProjectFormValues;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(project);
  const action = isEdit ? updateProjectAction.bind(null, project!.id) : createProjectAction;
  const [state, formAction, pending] = useActionState<ProjectActionState, FormData>(action, undefined);
  const [type, setType] = useState<ProjectType>(project?.type ?? "TRAVEL");

  useEffect(() => {
    if (state && !state.error) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <Select name="type" value={type} onValueChange={(v) => setType(v as ProjectType)}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABELS) as ProjectType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" name="name" defaultValue={project?.name ?? ""} required />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estimatedAmount">Budget estimé</Label>
          <Input
            id="estimatedAmount"
            name="estimatedAmount"
            inputMode="decimal"
            placeholder="2500,00"
            defaultValue={project ? (project.estimatedAmountCents / 100).toFixed(2) : ""}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency">Devise</Label>
          <Select name="currency" defaultValue={project?.currency ?? DEFAULT_CURRENCY}>
            <SelectTrigger id="currency" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optionnel)</Label>
        <Textarea id="description" name="description" defaultValue={project?.description ?? ""} />
      </div>

      {type === "TRAVEL" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Mode voyage
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              name="destination"
              placeholder="🇯🇵 Japon"
              defaultValue={project?.destination ?? ""}
              required={type === "TRAVEL"}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="travelStartDate">Date de départ</Label>
              <Input
                id="travelStartDate"
                name="travelStartDate"
                type="date"
                defaultValue={toDateInputValue(project?.travelStartDate)}
                required={type === "TRAVEL"}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="travelEndDate">Date de retour</Label>
              <Input
                id="travelEndDate"
                name="travelEndDate"
                type="date"
                defaultValue={toDateInputValue(project?.travelEndDate)}
                required={type === "TRAVEL"}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="travelerCount">Nombre de voyageurs</Label>
            <Input
              id="travelerCount"
              name="travelerCount"
              type="number"
              min={1}
              defaultValue={project?.travelerCount ?? 1}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetDate">Date prévue (optionnel)</Label>
          <Input
            id="targetDate"
            name="targetDate"
            type="date"
            defaultValue={toDateInputValue(project?.targetDate)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deadlineDate">Date limite (optionnel)</Label>
          <Input
            id="deadlineDate"
            name="deadlineDate"
            type="date"
            defaultValue={toDateInputValue(project?.deadlineDate)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budgetSafetyMarginPct">Marge de sécurité budget % (optionnel)</Label>
          <Input
            id="budgetSafetyMarginPct"
            name="budgetSafetyMarginPct"
            type="number"
            min={0}
            max={100}
            placeholder="10"
            defaultValue={project?.budgetSafetyMarginPct ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fxSafetyMarginPct">Marge de sécurité taux de change % (optionnel)</Label>
          <Input
            id="fxSafetyMarginPct"
            name="fxSafetyMarginPct"
            type="number"
            min={0}
            max={100}
            placeholder="5"
            defaultValue={project?.fxSafetyMarginPct ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (optionnel)</Label>
        <Textarea id="notes" name="notes" defaultValue={project?.notes ?? ""} />
      </div>

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

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectFormValues;
}) {
  const isEdit = Boolean(project);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
          <DialogDescription>
            Planifiez une dépense importante à l&apos;avance — voyage, achat, événement…
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ProjectForm
            key={project?.id ?? "create"}
            project={project}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
