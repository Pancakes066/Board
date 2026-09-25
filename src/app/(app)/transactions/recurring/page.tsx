import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { listRecurringRulesForUser } from "@/server/services/recurring-rules/recurring-rules";
import { listCategoriesForUser } from "@/server/services/categories/categories";
import { listSavingsGoalOptions } from "@/server/services/savings/goal-projection";
import { listAccountOptions } from "@/server/services/accounts/accounts";
import { currentTimestamp } from "@/lib/utils/date";
import { TransactionsTabs } from "../transactions-tabs";
import { RecurringRuleList } from "./recurring-rule-list";

export default async function RecurringRulesPage() {
  const user = await requireUser();
  const [rules, categories, savingsGoals, accounts] = await Promise.all([
    listRecurringRulesForUser(user.id),
    listCategoriesForUser(user.id),
    listSavingsGoalOptions(user.id),
    listAccountOptions(user.id),
  ]);
  const now = currentTimestamp();

  return (
    <div>
      <PageHeader
        title="Revenus et dépenses récurrents"
        description="Configurez-les une fois, ils se génèrent automatiquement chaque mois."
      />
      <TransactionsTabs />
      <RecurringRuleList
        rules={rules}
        categories={categories}
        savingsGoals={savingsGoals}
        accounts={accounts}
        now={now}
      />
    </div>
  );
}
