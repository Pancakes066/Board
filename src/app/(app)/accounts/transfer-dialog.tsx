"use client";

import { useActionState, useEffect } from "react";

import { createTransferAction, type AccountActionState } from "@/server/actions/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type AccountOption = { id: string; name: string; currency: string };

function TransferForm({
  accounts,
  onSuccess,
  onCancel,
}: {
  accounts: AccountOption[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<AccountActionState, FormData>(
    createTransferAction,
    undefined,
  );

  useEffect(() => {
    if (state && !state.error) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fromAccountId">Depuis</Label>
          <Select name="fromAccountId" defaultValue={accounts[0]?.id}>
            <SelectTrigger id="fromAccountId" className="w-full">
              <SelectValue placeholder="Compte source" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="toAccountId">Vers</Label>
          <Select name="toAccountId" defaultValue={accounts[1]?.id ?? accounts[0]?.id}>
            <SelectTrigger id="toAccountId" className="w-full">
              <SelectValue placeholder="Compte destination" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Montant</Label>
          <Input id="amount" name="amount" inputMode="decimal" placeholder="500,00" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={today} required />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Note (optionnel)</Label>
        <Input id="note" name="note" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending || accounts.length < 2}>
          {pending ? "Transfert…" : "Transférer"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TransferDialog({
  open,
  onOpenChange,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountOption[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transférer entre comptes</DialogTitle>
          <DialogDescription>
            Un simple déplacement d&apos;argent — jamais compté comme revenu ou dépense dans vos
            statistiques.
          </DialogDescription>
        </DialogHeader>
        {open &&
          (accounts.length < 2 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Il vous faut au moins deux comptes pour faire un transfert.
            </p>
          ) : (
            <TransferForm
              accounts={accounts}
              onSuccess={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          ))}
      </DialogContent>
    </Dialog>
  );
}
