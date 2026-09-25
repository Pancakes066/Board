import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/session";
import { listProjectsWithProgress } from "@/server/services/projects/projects";
import { currentTimestamp } from "@/lib/utils/date";
import { ProjectList } from "./project-list";
import { CurrencyConverter } from "./currency-converter";

export default async function ProjectsPage() {
  const user = await requireUser();
  const now = new Date(currentTimestamp());

  const projects = await listProjectsWithProgress(user.id, now);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projets"
        description="Planifiez financièrement un voyage, un achat ou un événement important."
      />
      <CurrencyConverter />
      <ProjectList projects={projects} />
    </div>
  );
}
