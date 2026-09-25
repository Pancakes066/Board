import { requireUser } from "@/server/auth/session";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppMobileNav } from "@/components/layout/app-mobile-nav";
import { ReminderNotifier } from "@/components/reminders/reminder-notifier";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar name={user.name} email={user.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileNav name={user.name} email={user.email} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
      <ReminderNotifier />
    </div>
  );
}
