import Link from "next/link";
import { Tags, ShieldCheck, CreditCard, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

const LINKS = [
  {
    href: "/settings/categories",
    icon: Tags,
    title: "Catégories",
    description: "Gérez vos catégories personnalisées.",
  },
  {
    href: "/settings/security",
    icon: ShieldCheck,
    title: "Sécurité et données",
    description: "Mot de passe, export, suppression du compte.",
  },
  {
    href: "/settings/billing",
    icon: CreditCard,
    title: "Abonnement",
    description: "Votre formule Board et ses fonctionnalités.",
  },
];

export default async function SettingsPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: { name: true, email: true, plan: true, startingBalanceCents: true, startingBalanceDate: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Paramètres" description="Votre profil et vos préférences." />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{user.name || user.email}</CardTitle>
            <Badge variant={user.plan === "PREMIUM" ? "default" : "secondary"}>
              {user.plan === "PREMIUM" ? "Premium" : "Gratuite"}
            </Badge>
          </div>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Solde de départ : {formatCurrency(user.startingBalanceCents)}
          {user.startingBalanceDate && ` au ${formatDate(user.startingBalanceDate)}`}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex items-start gap-3 py-5">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
