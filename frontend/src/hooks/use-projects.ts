"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  Project,
  ProjectDCAAnalysis,
  ProjectMBAnalysis,
  ProjectWTAnalysis,
  ProjectListSummary,
  ProjectSummary,
  BatchDCARequest,
  BatchDCAResult,
} from "@/types/project";

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

export function useProjectMB(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "material-balance"],
    queryFn: () => api.get<ProjectMBAnalysis[]>(`/projects/${projectId}/material-balance`),
    enabled: !!projectId,
  });
}

export function useProjectWT(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "well-test"],
    queryFn: () => api.get<ProjectWTAnalysis[]>(`/projects/${projectId}/well-test`),
    enabled: !!projectId,
  });
}

export function useProjectSummaries() {
  return useQuery({
    queryKey: ["projects", "summaries"],
    queryFn: () => api.get<ProjectListSummary[]>("/projects/summaries"),
    refetchInterval: 60_000,
  });
}

export function useProjectSummary(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "summary"],
    queryFn: () => api.get<ProjectSummary>(`/projects/${projectId}/summary`),
    enabled: !!projectId,
    refetchInterval: 60_000,
  });
}

export function useBatchDCA(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BatchDCARequest) =>
      api.post<BatchDCAResult>(`/projects/${projectId}/batch-dca`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "dca"] });
      queryClient.invalidateQueries({ queryKey: ["projects", projectId, "summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
