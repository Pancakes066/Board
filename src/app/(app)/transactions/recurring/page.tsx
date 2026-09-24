import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { listRecurringRulesForUser } from "@/server/services/recurring-rules/recurring-rules";
import { listCategoriesForUser } from "@/server/services/categories/categories";
import { TransactionsTabs } from "../transactions-tabs";
import { RecurringRuleList } from "./recurring-rule-list";

export default async function RecurringRulesPage() {
  const user = await requireUser();
  const [rules, categories] = await Promise.all([
    listRecurringRulesForUser(user.id),
    listCategoriesForUser(user.id),
  ]);
  // requireUser() already reads the session cookie, which forces this page
  // dynamic (per-request) — there's no static/cached render for Date.now()
  // to go stale against here, so reading it is intentionally safe despite
  // the purity lint rule (which mainly guards against exactly that staleness).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

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
