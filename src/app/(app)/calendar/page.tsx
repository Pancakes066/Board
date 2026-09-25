import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { getCalendarEvents } from "@/server/services/calendar/calendar";
import { periodOf, daysInMonth, type Period } from "@/lib/utils/date";
import { CalendarView } from "./calendar-view";

function parsePeriod(searchParams: Record<string, string | string[] | undefined>): Period {
  const year = Number(searchParams.year);
  const month = Number(searchParams.month);
  if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
    return { year, month };
  }
  return periodOf(new Date());
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const user = await requireUser();
  const params = await searchParams;
  const period = parsePeriod(params);

  const from = new Date(Date.UTC(period.year, period.month - 1, 1));
  const to = new Date(Date.UTC(period.year, period.month - 1, daysInMonth(period.year, period.month), 23, 59, 59));

  const events = await getCalendarEvents(user.id, { from, to });

  return (
    <div>
      <PageHeader
        title="Calendrier"
        description="Vos revenus, dépenses, épargne et rappels dans le temps."
      />
      <CalendarView period={period} events={events} />
    </div>
  );
}
