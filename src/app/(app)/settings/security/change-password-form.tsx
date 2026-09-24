"use client";

import { useActionState } from "react";

import { changePasswordAction, type AccountActionState } from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<AccountActionState, FormData>(
    changePasswordAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
        <Input id="newPassword" name="newPassword" type="password" minLength={8} required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-positive">{state.success}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Mise à jour…" : "Mettre à jour le mot de passe"}
      </Button>
    </form>
  );
}
