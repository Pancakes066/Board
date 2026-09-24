"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Category, RecurringRule } from "@prisma/client";

import {
  deleteRecurringRuleAction,
  reactivateRecurringRuleAction,
  stopRecurringRuleAction,
} from "@/server/actions/recurring-rules";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { describeFrequency } from "@/lib/utils/recurring-rule-format";
import { RecurringRuleFormDialog } from "./recurring-rule-form-dialog";

type RuleWithCategory = RecurringRule & { category: Category };

const TYPE_LABEL: Record<RuleWithCategory["type"], string> = {
  INCOME: "Revenu",
  EXPENSE: "Dépense",
  SAVINGS: "Épargne",
};

const TYPE_BADGE_VARIANT: Record<RuleWithCategory["type"], "positive" | "destructive" | "default"> = {
  INCOME: "positive",
  EXPENSE: "destructive",
  SAVINGS: "default",
};

function RuleStatus({ endDate, now }: { endDate: Date | null; now: number }) {
  if (!endDate) return <Badge variant="positive">Active</Badge>;
  const stopped = endDate.getTime() <= now;
  return (
    <Badge variant="secondary">
      {stopped ? `Arrêtée le ${formatDate(endDate)}` : `Jusqu'au ${formatDate(endDate)}`}
    </Badge>
  );
}

function RuleRow({
  rule,
  categories,
  now,
}: {
  rule: RuleWithCategory;
  categories: Category[];
  now: number;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const stopped = rule.endDate !== null && rule.endDate.getTime() <= now;

  function handleStopOrReactivate() {
    startTransition(async () => {
      const result = stopped
        ? await reactivateRecurringRuleAction(rule.id)
        : await stopRecurringRuleAction(rule.id);
      if (result.error) toast.error(result.error);
      else toast.success(stopped ? "Règle réactivée." : "Règle arrêtée.");
    });
  }

  function handleDelete() {
    if (!confirm(`Supprimer définitivement « ${rule.name} » ?`)) return;
    startTransition(async () => {
      const result = await deleteRecurringRuleAction(rule.id);
      if (result.error) toast.error(result.error);
      else toast.success("Règle supprimée.");
    });
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <Badge variant={TYPE_BADGE_VARIANT[rule.type]}>{TYPE_LABEL[rule.type]}</Badge>
        </TableCell>
        <TableCell className="font-medium">
          {rule.isSubscription ? "🔁 " : ""}
          {rule.name}
        </TableCell>
        <TableCell>{formatCurrency(rule.amountCents)}</TableCell>
        <TableCell className="text-muted-foreground">{describeFrequency(rule)}</TableCell>
        <TableCell>
          {rule.category.emoji} {rule.category.name}
        </TableCell>
        <TableCell>
          <RuleStatus endDate={rule.endDate} now={now} />
        </TableCell>
        <TableCell>
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label="Modifier">
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleStopOrReactivate}
              disabled={isPending}
              aria-label={stopped ? "Réactiver" : "Arrêter"}
            >
              {stopped ? <RotateCcw className="size-3.5" /> : <Ban className="size-3.5" />}
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
        </TableCell>
      </TableRow>
      <RecurringRuleFormDialog
        open={editing}
        onOpenChange={setEditing}
        categories={categories}
        rule={rule}
      />
    </>
  );
}

export function RecurringRuleList({
  rules,
  categories,
  now,
}: {
  rules: RuleWithCategory[];
  categories: Category[];
  /** Unix ms timestamp, computed once server-side at page render. */
  now: number;
}) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Ajouter
        </Button>
      </div>

      <Card>
        <CardContent>
          {rules.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucun revenu ou dépense récurrent pour l&apos;instant.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Fréquence</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <RuleRow key={rule.id} rule={rule} categories={categories} now={now} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RecurringRuleFormDialog open={creating} onOpenChange={setCreating} categories={categories} />
    </div>
  );
}
