"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Plus, Receipt } from "lucide-react";
import type { Category, FlowType, OccurrenceStatus, RecurringRule, Transaction } from "@prisma/client";

import {
  deleteManualTransactionAction,
  setTransactionStatusAction,
  skipOccurrenceAction,
  unskipOccurrenceAction,
} from "@/server/actions/transactions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { TransactionFormDialog, type TransactionFormValues, type AccountOption } from "./transaction-form-dialog";

type TransactionWithRelations = Transaction & {
  category: Category;
  recurringRule: RecurringRule | null;
};

const TYPE_AMOUNT_CLASS: Record<FlowType, string> = {
  INCOME: "text-positive",
  EXPENSE: "text-destructive",
  SAVINGS: "text-primary",
};

const TYPE_SIGN: Record<FlowType, "+" | "−"> = {
  INCOME: "+",
  EXPENSE: "−",
  SAVINGS: "−",
};

const STATUS_LABEL: Record<OccurrenceStatus, string> = {
  PLANNED: "⏳ Prévue",
  COMPLETED: "✅ Effectuée",
  SKIPPED: "➖ Ignorée",
};

function toFormValues(t: TransactionWithRelations): TransactionFormValues {
  return {
    id: t.id,
    type: t.type,
    amountCents: t.amountCents,
    categoryId: t.categoryId,
    accountId: t.accountId,
    date: t.date,
    status: t.status,
    notes: t.notes,
    recurringRuleId: t.recurringRuleId,
    ruleName: t.recurringRule?.name,
  };
}

function TransactionRow({
  transaction,
  categories,
  accounts,
}: {
  transaction: TransactionWithRelations;
  categories: Category[];
  accounts: AccountOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isManual = transaction.recurringRuleId === null;

  function toggleCompleted() {
    const nextStatus = transaction.status === "COMPLETED" ? "PLANNED" : "COMPLETED";
    startTransition(async () => {
      const result = await setTransactionStatusAction(transaction.id, nextStatus);
      if (result.error) toast.error(result.error);
    });
  }

  function handleSkip() {
    startTransition(async () => {
      const result = await skipOccurrenceAction(transaction.id);
      if (result.error) toast.error(result.error);
      else toast.success("Occurrence ignorée.");
    });
  }

  function handleUnskip() {
    startTransition(async () => {
      const result = await unskipOccurrenceAction(transaction.id);
      if (result.error) toast.error(result.error);
    });
  }

  function handleDelete() {
    if (!confirm("Supprimer cette transaction ?")) return;
    startTransition(async () => {
      const result = await deleteManualTransactionAction(transaction.id);
      if (result.error) toast.error(result.error);
      else toast.success("Transaction supprimée.");
    });
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <Checkbox
            checked={transaction.status === "COMPLETED"}
            disabled={transaction.status === "SKIPPED" || isPending}
            onCheckedChange={toggleCompleted}
            aria-label="Marquer comme effectuée"
          />
        </TableCell>
        <TableCell className="font-medium">
          {transaction.recurringRule ? `${transaction.recurringRule.isSubscription ? "🔁 " : ""}${transaction.recurringRule.name}` : (transaction.notes ?? "Transaction manuelle")}
          {transaction.isModified && (
            <Badge variant="outline" className="ml-2 text-[10px]">
              modifiée
            </Badge>
          )}
        </TableCell>
        <TableCell>
          {transaction.category.emoji} {transaction.category.name}
        </TableCell>
        <TableCell className="text-muted-foreground">{formatDate(transaction.date)}</TableCell>
        <TableCell>
          <Badge variant={transaction.status === "SKIPPED" ? "secondary" : "outline"}>
            {STATUS_LABEL[transaction.status]}
          </Badge>
        </TableCell>
        <TableCell className={cn("text-right font-medium", TYPE_AMOUNT_CLASS[transaction.type])}>
          {TYPE_SIGN[transaction.type]} {formatCurrency(transaction.amountCents)}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions" disabled={isPending}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(true)}>Modifier</DropdownMenuItem>
              {!isManual && transaction.status !== "SKIPPED" && (
                <DropdownMenuItem onSelect={handleSkip}>Ignorer</DropdownMenuItem>
              )}
              {!isManual && transaction.status === "SKIPPED" && (
                <DropdownMenuItem onSelect={handleUnskip}>Réactiver</DropdownMenuItem>
              )}
              {isManual && (
                <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      <TransactionFormDialog
        open={editing}
        onOpenChange={setEditing}
        categories={categories}
        accounts={accounts}
        transaction={toFormValues(transaction)}
      />
    </>
  );
}

const STATUS_FILTERS = [
  { value: "ALL", label: "Toutes" },
  { value: "PLANNED", label: "Prévues" },
  { value: "COMPLETED", label: "Effectuées" },
  { value: "SKIPPED", label: "Ignorées" },
] as const;

export function TransactionList({
  transactions,
  categories,
  accounts = [],
}: {
  transactions: TransactionWithRelations[];
  categories: Category[];
  accounts?: AccountOption[];
}) {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("ALL");
  const [creating, setCreating] = useState(false);

  const filtered =
    statusFilter === "ALL" ? transactions : transactions.filter((t) => t.status === statusFilter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList>
            {STATUS_FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Ajouter
        </Button>
      </div>

      <Card>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Receipt className="size-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Aucune transaction pour ce filtre.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Nom</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TransactionRow key={t.id} transaction={t} categories={categories} accounts={accounts} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TransactionFormDialog open={creating} onOpenChange={setCreating} categories={categories} accounts={accounts} />
    </div>
  );
}
