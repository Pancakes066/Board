import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function UpsellCard({ message }: { message: string }) {
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <Sparkles className="size-6 text-primary" />
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
        <Button asChild size="sm">
          <Link href="/settings/billing">Passer à Premium</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
