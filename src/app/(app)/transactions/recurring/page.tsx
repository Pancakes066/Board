import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { listRecurringRulesForUser } from "@/server/services/recurring-rules/recurring-rules";
import { listCategoriesForUser } from "@/server/services/categories/categories";
import { currentTimestamp } from "@/lib/utils/date";
import { TransactionsTabs } from "../transactions-tabs";
import { RecurringRuleList } from "./recurring-rule-list";

export default async function RecurringRulesPage() {
  const user = await requireUser();
  const [rules, categories] = await Promise.all([
    listRecurringRulesForUser(user.id),
    listCategoriesForUser(user.id),
  ]);
  const now = currentTimestamp();

  return (
    <div>
      <PageHeader
        title="Revenus et dépenses récurrents"
        description="Configurez-les une fois, ils se génèrent automatiquement chaque mois."
      />
      <TransactionsTabs />
      <RecurringRuleList rules={rules} categories={categories} now={now} />
    </div>
  );
}
