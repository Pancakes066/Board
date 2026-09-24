import { requireUser } from "@/server/auth/session";

// Placeholder — replaced by the real dashboard (KPI tiles, chart) later.
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div>
      <h1 className="text-xl font-semibold">Bonjour{user.name ? `, ${user.name}` : ""} 👋</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Le dashboard arrive dans une prochaine étape.
      </p>
    </div>
  );
}
