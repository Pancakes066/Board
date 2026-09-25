"use client";

import { useActionState, useState } from "react";
import { ArrowLeftRight } from "lucide-react";

import { convertCurrencyAction, type ConvertActionState } from "@/server/actions/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES } from "@/lib/constants/currencies";
import { formatCurrencyIn } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

export function CurrencyConverter() {
  const [state, formAction, pending] = useActionState<ConvertActionState, FormData>(
    convertCurrencyAction,
    undefined,
  );
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("JPY");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convertisseur de devises</CardTitle>
        <CardDescription>Un outil rapide, indépendant de vos projets.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Montant</Label>
            <Input id="amount" name="amount" inputMode="decimal" placeholder="1000" className="w-32" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="from">De</Label>
            <Select name="from" value={from} onValueChange={setFrom}>
              <SelectTrigger id="from" className="w-32">
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Inverser les devises"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
          >
            <ArrowLeftRight className="size-4" />
          </Button>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to">Vers</Label>
            <Select name="to" value={to} onValueChange={setTo}>
              <SelectTrigger id="to" className="w-32">
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
          <Button type="submit" disabled={pending}>
            {pending ? "Conversion…" : "Convertir"}
          </Button>
        </form>

        {state && !state.ok && <p className="mt-3 text-sm text-destructive">{state.error}</p>}
        {state?.ok && (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xl font-semibold tabular-nums">
              ≈ {formatCurrencyIn(state.resultCents, to)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Taux utilisé : 1 {from} = {state.rate.toFixed(4)} {to} — dernière mise à jour :{" "}
              {formatDate(new Date(state.fetchedAt))}
              {state.stale && " (hors ligne, dernière valeur connue)"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
