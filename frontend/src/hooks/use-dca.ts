"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  DCAAnalysis,
  DCACreate,
  DCAAutoFitRequest,
  DCAAutoFitResult,
  DCAMonteCarloRequest,
} from "@/types/dca";

export function useDCAAnalyses(wellId: string) {
  return useQuery({
    queryKey: ["dca", wellId],
    queryFn: () => api.get<DCAAnalysis[]>(`/wells/${wellId}/dca`),
    enabled: !!wellId,
  });
}

export function useDCAAnalysis(wellId: string, analysisId: string) {
  return useQuery({
    queryKey: ["dca", wellId, analysisId],
    queryFn: () => api.get<DCAAnalysis>(`/wells/${wellId}/dca/${analysisId}`),
    enabled: !!wellId && !!analysisId,
  });
}

export function useCreateDCA(wellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DCACreate) => api.post<DCAAnalysis>(`/wells/${wellId}/dca`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dca", wellId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useAutoFit() {
  return useMutation({
    mutationFn: (data: DCAAutoFitRequest) =>
      api.post<DCAAutoFitResult[]>("/dca/auto-fit", data),
  });
}

export function useRunMonteCarlo(wellId: string, analysisId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DCAMonteCarloRequest) =>
      api.post(`/wells/${wellId}/dca/${analysisId}/monte-carlo`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dca", wellId] });
      queryClient.invalidateQueries({ queryKey: ["dca", wellId, analysisId] });
    },
  });
}

export function useDeleteDCA(wellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (analysisId: string) => api.del(`/wells/${wellId}/dca/${analysisId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dca", wellId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
