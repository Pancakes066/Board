import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { listBudgetsWithProgress } from "@/server/services/budgets/budget-progress";
import { listCategoriesForUser } from "@/server/services/categories/categories";
import { currentTimestamp, periodOf } from "@/lib/utils/date";
import { BudgetList } from "./budget-list";

export default async function BudgetsPage() {
  const user = await requireUser();
  const period = periodOf(new Date(currentTimestamp()));

  const [budgets, categories] = await Promise.all([
    listBudgetsWithProgress(user.id, period),
    listCategoriesForUser(user.id),
  ]);

  const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const availableCategories = categories.filter((c) => !budgetedCategoryIds.has(c.id));

  return (
    <div>
      <PageHeader title="Budgets" description="Un plafond par catégorie, avec suivi visuel." />
      <BudgetList budgets={budgets} availableCategories={availableCategories} allCategories={categories} />
    </div>
  );
}
