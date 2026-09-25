"use client";

import { useActionState, useEffect } from "react";

import {
  createAccountAction,
  updateAccountAction,
  type AccountActionState,
} from "@/server/actions/accounts";
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
import { ACCOUNT_TYPE_OPTIONS } from "./account-type-labels";

export type AccountFormValues = {
  id: string;
  name: string;
  type: string;
  currency: string;
  description: string | null;
  isActive: boolean;
};

function AccountForm({
  account,
  onSuccess,
  onCancel,
}: {
  account?: AccountFormValues;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(account);
  const action = isEdit ? updateAccountAction.bind(null, account!.id) : createAccountAction;
  const [state, formAction, pending] = useActionState<AccountActionState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state && !state.error) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" name="name" defaultValue={account?.name ?? ""} placeholder="Compte courant" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">Type</Label>
          <Select name="type" defaultValue={account?.type ?? "CHECKING"}>
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency">Devise</Label>
          <Input
            id="currency"
            name="currency"
            defaultValue={account?.currency ?? "EUR"}
            maxLength={3}
            className="uppercase"
          />
        </div>
      </div>
      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startingBalance">Solde initial</Label>
          <Input id="startingBalance" name="startingBalance" inputMode="decimal" placeholder="0,00" />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optionnel)</Label>
        <Input id="description" name="description" defaultValue={account?.description ?? ""} />
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

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountFormValues;
}) {
  const isEdit = Boolean(account);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le compte" : "Nouveau compte"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Le solde initial ne peut pas être modifié ici — il se recalcule à partir des transactions."
              : "Un compte pour suivre un solde séparément — courant, livret, espèces…"}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <AccountForm
            key={account?.id ?? "create"}
            account={account}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
