"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import type { Period } from "@/lib/utils/date";
import { generateMonthAction } from "@/server/actions/transactions";
import { Button } from "@/components/ui/button";

export function GenerateMonthButton({ period }: { period: Period }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await generateMonthAction(period);
      if (result.error) toast.error(result.error);
      else toast.success("Transactions générées pour ce mois.");
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      <RefreshCw className="size-4" /> Générer le mois
    </Button>
  );
}
