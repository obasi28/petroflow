"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useWells } from "@/hooks/use-wells";
import { WellTable } from "@/components/wells/well-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
  });

  const { data: wellsData, isLoading: wellsLoading } = useWells({
    project_id: projectId,
    per_page: 100,
  });

  const project = projectData?.data;
  const wells = wellsData?.data || [];

  if (projectLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground">{project.description}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Wells ({wells.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wellsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <WellTable data={wells} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
