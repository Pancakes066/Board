import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { listAccountsWithBalance, totalsByCurrency } from "@/server/services/accounts/accounts";
import { listTransfers } from "@/server/services/accounts/transfers";
import { currentTimestamp } from "@/lib/utils/date";
import { AccountsList } from "./accounts-list";

export default async function AccountsPage() {
  const user = await requireUser();
  const now = new Date(currentTimestamp());

  const [accounts, transfers] = await Promise.all([
    listAccountsWithBalance(user.id, now),
    listTransfers(user.id),
  ]);
  const totals = totalsByCurrency(accounts);

  return (
    <div>
      <PageHeader
        title="Comptes"
        description="Vos différents comptes financiers et leur solde, séparément de l'argent réellement disponible."
      />
      <AccountsList accounts={accounts} totals={totals} transfers={transfers} />
    </div>
  );
}
