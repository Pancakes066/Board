"use client";

import { useState } from "react";
import { Plus, Rocket } from "lucide-react";

import type { ProjectWithProgress } from "@/server/services/projects/projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectCard } from "./project-card";
import { ProjectFormDialog } from "./project-form-dialog";

export function ProjectList({ projects }: { projects: ProjectWithProgress[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Nouveau projet
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Rocket className="size-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucun projet pour l&apos;instant.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectFormDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
