"use client";

import { useActionState, useState } from "react";

import { deleteAccountAction, type AccountActionState } from "@/server/actions/account";
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
  DialogTrigger,
} from "@/components/ui/dialog";

function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState<AccountActionState, FormData>(
    deleteAccountAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" name="password" type="password" required autoFocus />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <DialogFooter>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Suppression…" : "Supprimer définitivement mon compte"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-fit">
          Supprimer mon compte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer votre compte ?</DialogTitle>
          <DialogDescription>
            Action irréversible : toutes vos transactions, règles récurrentes, budgets et objectifs
            d&apos;épargne seront définitivement supprimés. Pensez à exporter vos données d&apos;abord
            si vous voulez les garder.
          </DialogDescription>
        </DialogHeader>
        {open && <DeleteAccountForm key="delete-form" />}
      </DialogContent>
    </Dialog>
  );
}
