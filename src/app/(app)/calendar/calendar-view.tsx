"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { CalendarEvent } from "@/lib/calendar-events";
import { netCompletedCentsForDay } from "@/lib/calendar-events";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatSignedCurrency } from "@/lib/utils/currency";
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  daysInMonth,
  nextPeriod,
  previousPeriod,
  type Period,
} from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const KIND_DOT: Record<CalendarEvent["kind"], string> = {
  income: "bg-positive",
  expense: "bg-destructive",
  savings: "bg-primary",
  reminder: "bg-warning",
};

const KIND_LABEL: Record<CalendarEvent["kind"], string> = {
  income: "Revenu",
  expense: "Dépense",
  savings: "Épargne",
  reminder: "Rappel",
};

const STATUS_LABEL: Record<NonNullable<CalendarEvent["status"]>, string> = {
  PLANNED: "Prévu",
  COMPLETED: "Effectué",
  SKIPPED: "Annulé",
};

type FilterKey = "income" | "expense" | "savings" | "subscriptions" | "projects" | "reminders";

const FILTER_DEFS: { key: FilterKey; label: string }[] = [
  { key: "income", label: "Revenus" },
  { key: "expense", label: "Dépenses" },
  { key: "savings", label: "Épargne" },
  { key: "subscriptions", label: "Abonnements" },
  { key: "projects", label: "Projets" },
  { key: "reminders", label: "Rappels" },
];

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function eventMatchesFilters(event: CalendarEvent, filters: Record<FilterKey, boolean>): boolean {
  if (event.kind === "reminder") return filters.reminders;
  if (event.isSubscription && !filters.subscriptions) return false;
  if (event.isProject && !filters.projects) return false;
  if (event.kind === "income") return filters.income;
  if (event.kind === "expense") return filters.expense;
  if (event.kind === "savings") return filters.savings;
  return true;
}

export function CalendarView({ period, events }: { period: Period; events: CalendarEvent[] }) {
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    income: true,
    expense: true,
    savings: true,
    subscriptions: true,
    projects: true,
    reminders: true,
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filteredEvents = useMemo(
    () => events.filter((e) => eventMatchesFilters(e, filters)),
    [events, filters],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of filteredEvents) {
      const key = dateKey(event.date);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [filteredEvents]);

  const total = daysInMonth(period.year, period.month);
  const firstDay = new Date(Date.UTC(period.year, period.month - 1, 1));
  const leadingBlanks = firstDay.getUTCDay();
  const days = Array.from({ length: total }, (_, i) => i + 1);

  const today = new Date();
  const todayKey = dateKey(today);

  const visibleDays =
    view === "day"
      ? days.filter((d) => dateKey(new Date(Date.UTC(period.year, period.month - 1, d))) === (selectedDate ?? todayKey))
      : view === "week" && selectedDate
        ? (() => {
            const anchor = new Date(selectedDate);
            const weekday = anchor.getUTCDay();
            const start = new Date(anchor);
            start.setUTCDate(anchor.getUTCDate() - weekday);
            const weekDays: number[] = [];
            for (let i = 0; i < 7; i += 1) {
              const d = new Date(start);
              d.setUTCDate(start.getUTCDate() + i);
              if (d.getUTCMonth() === period.month - 1 && d.getUTCFullYear() === period.year) {
                weekDays.push(d.getUTCDate());
              }
            }
            return weekDays;
          })()
        : days;

  const selectedEvents = selectedDate ? (eventsByDay.get(selectedDate) ?? []) : [];
  const netCents = netCompletedCentsForDay(selectedEvents);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/calendar?year=${previousPeriod(period).year}&month=${previousPeriod(period).month}`}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <span className="min-w-40 text-center text-sm font-medium">
            {MONTH_LABELS[period.month - 1]} {period.year}
          </span>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/calendar?year=${nextPeriod(period).year}&month=${nextPeriod(period).month}`}>
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="month">Mois</TabsTrigger>
            <TabsTrigger value="week">Semaine</TabsTrigger>
            <TabsTrigger value="day">Jour</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-wrap gap-4">
        {FILTER_DEFS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={filters[f.key]}
              onCheckedChange={(checked) =>
                setFilters((prev) => ({ ...prev, [f.key]: checked === true }))
              }
            />
            {f.label}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent>
            {view === "month" && (
              <div className="grid grid-cols-7 gap-1 text-xs">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="p-1 text-center text-muted-foreground">
                    {label.slice(0, 3)}
                  </div>
                ))}
                {Array.from({ length: leadingBlanks }, (_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {days.map((day) => {
                  const key = dateKey(new Date(Date.UTC(period.year, period.month - 1, day)));
                  const dayEvents = eventsByDay.get(key) ?? [];
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      className={cn(
                        "flex min-h-16 flex-col items-start gap-1 rounded-md border border-transparent p-1.5 text-left hover:border-border",
                        selectedDate === key && "border-primary",
                        key === todayKey && "bg-secondary/50",
                      )}
                    >
                      <span className="text-xs font-medium">{day}</span>
                      <div className="flex flex-wrap gap-0.5">
                        {dayEvents.slice(0, 4).map((e) => (
                          <span key={e.id} className={cn("size-1.5 rounded-full", KIND_DOT[e.kind])} />
                        ))}
                        {dayEvents.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 4}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {view !== "month" && (
              <div className="flex flex-col gap-3">
                {visibleDays.map((day) => {
                  const key = dateKey(new Date(Date.UTC(period.year, period.month - 1, day)));
                  const dayEvents = eventsByDay.get(key) ?? [];
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      className={cn(
                        "flex flex-col gap-1 rounded-md border p-2 text-left",
                        selectedDate === key ? "border-primary" : "border-border",
                      )}
                    >
                      <span className="text-sm font-medium">
                        {day} {MONTH_LABELS[period.month - 1]}
                      </span>
                      {dayEvents.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Aucun événement</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {dayEvents.map((e) => (
                            <div key={e.id} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5">
                                <span className={cn("size-1.5 rounded-full", KIND_DOT[e.kind])} />
                                {e.label}
                              </span>
                              {e.amountCents !== undefined && (
                                <span>{formatCurrency(e.amountCents)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">Sélectionnez un jour pour voir le détail.</p>
            ) : (
              <>
                <p className="font-medium">{new Date(selectedDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" })}</p>
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun événement ce jour-là.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedEvents.map((e) => (
                      <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <span className={cn("size-2 rounded-full", KIND_DOT[e.kind])} />
                          <span>
                            {e.label}
                            {e.time ? ` — ${e.time}` : ""}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          {e.amountCents !== undefined && <span>{formatCurrency(e.amountCents)}</span>}
                          {e.status && (
                            <Badge variant={e.status === "SKIPPED" ? "secondary" : "outline"}>
                              {STATUS_LABEL[e.status]}
                            </Badge>
                          )}
                          {e.kind === "reminder" && <Badge variant="outline">{KIND_LABEL.reminder}</Badge>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedEvents.some((e) => e.status === "COMPLETED") && (
                  <p className="border-t border-border pt-2 text-sm">
                    Solde net (effectué) ce jour :{" "}
                    <span className={netCents >= 0 ? "text-positive" : "text-destructive"}>
                      {formatSignedCurrency(netCents)}
                    </span>
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
