import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { getProjectWithProgress } from "@/server/services/projects/projects";
import { listSavingsGoalOptions } from "@/server/services/savings/goal-projection";
import { listCategoriesForUser } from "@/server/services/categories/categories";
import { getForecast } from "@/server/services/forecast/available-money";
import { currentTimestamp, formatDate, periodOf, monthsBetweenPeriods } from "@/lib/utils/date";
import { ExpenseList } from "./expense-list";
import { SavingsGoalSection } from "./savings-goal-section";
import { AffordabilityCard } from "./affordability-card";
import { ProjectEditButton } from "./project-edit-button";

const TYPE_LABELS: Record<string, string> = {
  TRAVEL: "✈️ Voyage",
  PURCHASE: "🛍️ Achat",
  EVENT: "🎉 Événement",
  MOVING: "📦 Déménagement",
  OTHER: "📁 Autre",
};

export default async function ProjectDetailPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  const user = await requireUser();
  const { projectId } = await params;
  const now = new Date(currentTimestamp());

  const [project, goalOptions, categories, forecast] = await Promise.all([
    getProjectWithProgress(user.id, projectId, now),
    listSavingsGoalOptions(user.id),
    listCategoriesForUser(user.id),
    getForecast(user.id, periodOf(now), now),
  ]);

  const savedCents = project.savingsGoal?.currentAmountCents ?? 0;
  const remainingCents = project.estimatedAmountCents - savedCents;
  const targetDate = project.savingsGoal?.targetDate ?? project.targetDate;
  const monthsRemaining = targetDate
    ? Math.max(monthsBetweenPeriods(periodOf(now), periodOf(targetDate)), 0)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${project.emoji ?? TYPE_LABELS[project.type].split(" ")[0]} ${project.name}`}
        description={TYPE_LABELS[project.type]}
        action={<ProjectEditButton project={project} />}
      />

      {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}

      {project.type === "TRAVEL" && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4 sm:grid-cols-4">
          {project.destination && (
            <div>
              <p className="text-xs text-muted-foreground">Destination</p>
              <p className="font-medium">{project.destination}</p>
            </div>
          )}
          {project.travelStartDate && (
            <div>
              <p className="text-xs text-muted-foreground">Date de départ</p>
              <p className="font-medium">{formatDate(project.travelStartDate)}</p>
            </div>
          )}
          {project.travelEndDate && (
            <div>
              <p className="text-xs text-muted-foreground">Date de retour</p>
              <p className="font-medium">{formatDate(project.travelEndDate)}</p>
            </div>
          )}
          {project.travelerCount && (
            <div>
              <p className="text-xs text-muted-foreground">Voyageurs</p>
              <p className="font-medium">{project.travelerCount}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SavingsGoalSection
          projectId={project.id}
          savingsGoal={project.savingsGoal}
          goalOptions={goalOptions}
          categories={categories}
        />
        <AffordabilityCard
          estimatedAmountCents={project.estimatedAmountCents}
          budgetSafetyMarginPct={project.budgetSafetyMarginPct}
          savedCents={savedCents}
          remainingCents={remainingCents}
          monthsRemaining={monthsRemaining}
          neededMonthlyCents={project.savingsGoal?.suggestedMonthlyContributionCents ?? null}
          availableMonthlyCents={forecast.available}
        />
      </div>

      <ExpenseList projectId={project.id} expenses={project.expenses} />
    </div>
  );
}
