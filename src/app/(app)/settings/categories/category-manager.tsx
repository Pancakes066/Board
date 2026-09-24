"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Category } from "@prisma/client";
import { deleteCategoryAction } from "@/server/actions/categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryFormDialog } from "./category-form-dialog";

function CategoryDot({ color }: { color: string | null }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color ?? "var(--muted-foreground)" }}
    />
  );
}

function CustomCategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Supprimer la catégorie « ${category.name} » ?`)) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (result.error) toast.error(result.error);
      else toast.success("Catégorie supprimée.");
    });
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
        <CategoryDot color={category.color} />
        <span className="text-sm">
          {category.emoji ? `${category.emoji} ` : ""}
          {category.name}
        </span>
        <div className="ml-auto flex gap-1">
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
      <CategoryFormDialog open={editing} onOpenChange={setEditing} category={category} />
    </>
  );
}

export function CategoryManager({
  defaultCategories,
  customCategories,
}: {
  defaultCategories: Category[];
  customCategories: Category[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Catégories par défaut</CardTitle>
          <CardDescription>Communes à tous les comptes, non modifiables.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {defaultCategories.map((category) => (
            <Badge key={category.id} variant="outline" className="gap-1.5 py-1.5">
              <CategoryDot color={category.color} />
              {category.emoji} {category.name}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vos catégories</CardTitle>
              <CardDescription>Créez-en autant que nécessaire.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {customCategories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucune catégorie personnalisée pour l&apos;instant.
            </p>
          ) : (
            customCategories.map((category) => (
              <CustomCategoryRow key={category.id} category={category} />
            ))
          )}
        </CardContent>
      </Card>

      <CategoryFormDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
