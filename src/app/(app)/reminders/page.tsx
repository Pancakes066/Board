import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { listReminders, listReminderLinkOptions } from "@/server/services/reminders/reminders";
import { RemindersList } from "./reminders-list";
import { NotificationPermissionBanner } from "./notification-permission-banner";

export default async function RemindersPage() {
  const user = await requireUser();
  const [reminders, linkOptions] = await Promise.all([
    listReminders(user.id),
    listReminderLinkOptions(user.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Rappels"
        description="Programmez des rappels personnalisés — un rappel ne crée jamais de transaction automatiquement."
      />
      <NotificationPermissionBanner />
      <RemindersList reminders={reminders} linkOptions={linkOptions} />
    </div>
  );
}
