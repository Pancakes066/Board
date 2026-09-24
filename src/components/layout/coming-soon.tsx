import { Card, CardContent } from "@/components/ui/card";

/** Placeholder for a nav destination not yet built — replaced milestone by milestone. */
export function ComingSoon({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {label} arrive dans une prochaine étape.
      </CardContent>
    </Card>
  );
}
