"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  WellTestAnalyzeRequest,
  WellTestAnalyzeResponse,
  WellTestAnalysis,
  WellTestCreate,
} from "@/types/well-test";

export function useAnalyzeWellTest() {
  return useMutation({
    mutationFn: (data: { wellId: string; payload: WellTestAnalyzeRequest }) =>
      api.post<WellTestAnalyzeResponse>(
        `/wells/${data.wellId}/well-test/analyze`,
        data.payload,
      ),
  });
}

export function useWellTestAnalyses(wellId: string) {
  return useQuery({
    queryKey: ["well-test", wellId],
    queryFn: () => api.get<WellTestAnalysis[]>(`/wells/${wellId}/well-test`),
    enabled: !!wellId,
  });
}

export function useSaveWellTest(wellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WellTestCreate) =>
      api.post<WellTestAnalysis>(`/wells/${wellId}/well-test`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["well-test", wellId] });
    },
  });
}

export function useDeleteWellTest(wellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (analysisId: string) =>
      api.del(`/wells/${wellId}/well-test/${analysisId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["well-test", wellId] });
    },
  });
}
