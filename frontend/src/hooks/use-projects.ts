"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Project, ProjectDCAAnalysis, ProjectListSummary, ProjectSummary } from "@/types/project";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<Project[]>("/projects"),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.get<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
  });
}

export function useProjectDCA(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "dca"],
    queryFn: () => api.get<ProjectDCAAnalysis[]>(`/projects/${projectId}/dca`),
    enabled: !!projectId,
  });
}

export function useProjectSummaries() {
  return useQuery({
    queryKey: ["projects", "summaries"],
    queryFn: () => api.get<ProjectListSummary[]>("/projects/summaries"),
  });
}

export function useProjectSummary(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "summary"],
    queryFn: () => api.get<ProjectSummary>(`/projects/${projectId}/summary`),
    enabled: !!projectId,
  });
}
