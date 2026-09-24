"use client";

import { useActionState, useEffect, useState } from "react";

import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryActionState,
} from "@/server/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const RANDOM_COLOR_POOL = [
  "#d4af37",
  "#6ea8fe",
  "#4ade80",
  "#f87171",
  "#a78bfa",
  "#f0883e",
  "#f472b6",
  "#2dd4bf",
];

function randomColor() {
  return RANDOM_COLOR_POOL[Math.floor(Math.random() * RANDOM_COLOR_POOL.length)];
}

type CategoryFormValues = { id: string; name: string; emoji: string | null; color: string | null };

function CategoryForm({
  category,
  onSuccess,
  onCancel,
}: {
  category?: CategoryFormValues;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(category);
  const action = isEdit ? updateCategoryAction.bind(null, category!.id) : createCategoryAction;
  const [state, formAction, pending] = useActionState<CategoryActionState, FormData>(
    action,
    undefined,
  );
  // Initialized once per mount (this component remounts via `key` whenever
  // the dialog opens or targets a different category — see below), so a
  // plain useState initializer is enough; no reset-on-prop-change effect.
  const [color, setColor] = useState(category?.color ?? randomColor());

  // The action returns `{}` (not undefined) on success, so this only fires
  // after a real successful submission — never on first mount.
  useEffect(() => {
    if (state && !state.error) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex w-20 flex-col gap-1.5">
          <Label htmlFor="emoji">Emoji</Label>
          <Input
            id="emoji"
            name="emoji"
            defaultValue={category?.emoji ?? ""}
            placeholder="🎯"
            maxLength={8}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="name">Nom</Label>
          <Input id="name" name="name" defaultValue={category?.name ?? ""} required />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="color">Couleur</Label>
        <div className="flex items-center gap-2">
          <input
            id="color"
            name="color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
          />
          <span className="text-sm text-muted-foreground">{color}</span>
        </div>
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

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit for "create a new category"; pass the row to edit it. */
  category?: CategoryFormValues;
}) {
  const isEdit = Boolean(category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajustez le nom, l'emoji ou la couleur."
              : "Elle sera disponible partout où vous choisissez une catégorie."}
          </DialogDescription>
        </DialogHeader>
        {/* Keying on the target resets all form/action state (including the
            color swatch) whenever the dialog switches between "create" and
            a given category to edit, or reopens fresh. */}
        {open && (
          <CategoryForm
            key={category?.id ?? "create"}
            category={category}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
