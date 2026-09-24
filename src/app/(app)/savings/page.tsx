import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { listSavingsGoalsWithProgress } from "@/server/services/savings/goal-projection";
import { listCategoriesForUser } from "@/server/services/categories/categories";
import { currentTimestamp } from "@/lib/utils/date";
import { SavingsGoalsList } from "./savings-goals-list";

export default async function SavingsPage() {
  const user = await requireUser();
  const now = new Date(currentTimestamp());

  const [goals, categories] = await Promise.all([
    listSavingsGoalsWithProgress(user.id, now),
    listCategoriesForUser(user.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Épargne"
        description="Vos objectifs d'épargne et votre épargne prévue chaque mois."
      />
      <SavingsGoalsList goals={goals} categories={categories} />
    </div>
  );
}
