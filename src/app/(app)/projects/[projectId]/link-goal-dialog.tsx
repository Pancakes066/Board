"use client";

import { useActionState, useEffect, useState } from "react";

import {
  linkSavingsGoalAction,
  createAndLinkSavingsGoalAction,
  type ProjectActionState,
} from "@/server/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type GoalOption = { id: string; name: string; emoji: string | null };

function LinkExistingForm({
  projectId,
  goalOptions,
  onSuccess,
  onCancel,
}: {
  projectId: string;
  goalOptions: GoalOption[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [goalId, setGoalId] = useState(goalOptions[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit() {
    if (!goalId) return;
    setPending(true);
    const result = await linkSavingsGoalAction(projectId, goalId);
    setPending(false);
    if (result.error) setError(result.error);
    else onSuccess();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="goalId">Objectif d&apos;épargne</Label>
        <Select value={goalId} onValueChange={setGoalId}>
          <SelectTrigger id="goalId" className="w-full">
            <SelectValue placeholder="Choisir un objectif" />
          </SelectTrigger>
          <SelectContent>
            {goalOptions.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.emoji} {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="button" disabled={pending || !goalId} onClick={handleSubmit}>
          {pending ? "Liaison…" : "Lier"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function CreateNewForm({
  projectId,
  onSuccess,
  onCancel,
}: {
  projectId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<ProjectActionState, FormData>(
    createAndLinkSavingsGoalAction.bind(null, projectId),
    undefined,
  );

  useEffect(() => {
    if (state && !state.error) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="emoji">Emoji</Label>
          <Input id="emoji" name="emoji" placeholder="🎯" maxLength={8} className="w-20" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" name="name" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetAmount">Objectif (€)</Label>
          <Input id="targetAmount" name="targetAmount" inputMode="decimal" placeholder="2500,00" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="initialAmount">Déjà économisé (€)</Label>
          <Input id="initialAmount" name="initialAmount" inputMode="decimal" placeholder="800,00" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="targetDate">Date cible (optionnel)</Label>
        <Input id="targetDate" name="targetDate" type="date" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Création…" : "Créer et lier"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function LinkGoalDialog({
  open,
  onOpenChange,
  projectId,
  goalOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  goalOptions: GoalOption[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lier un objectif d&apos;épargne</DialogTitle>
          <DialogDescription>
            Pour calculer combien mettre de côté chaque mois pour ce projet.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <Tabs defaultValue={goalOptions.length > 0 ? "existing" : "new"}>
            <TabsList className="w-full">
              <TabsTrigger value="existing" disabled={goalOptions.length === 0} className="flex-1">
                Objectif existant
              </TabsTrigger>
              <TabsTrigger value="new" className="flex-1">
                Nouvel objectif
              </TabsTrigger>
            </TabsList>
            <TabsContent value="existing">
              <LinkExistingForm
                projectId={projectId}
                goalOptions={goalOptions}
                onSuccess={() => onOpenChange(false)}
                onCancel={() => onOpenChange(false)}
              />
            </TabsContent>
            <TabsContent value="new">
              <CreateNewForm
                projectId={projectId}
                onSuccess={() => onOpenChange(false)}
                onCancel={() => onOpenChange(false)}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
