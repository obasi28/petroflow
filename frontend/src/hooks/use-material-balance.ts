"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  MaterialBalanceCalculateRequest,
  MaterialBalanceCalculateResponse,
  MaterialBalanceAnalysis,
  MaterialBalanceCreate,
} from "@/types/material-balance";

export function useCalculateMB() {
  return useMutation({
    mutationFn: (data: { wellId: string; payload: MaterialBalanceCalculateRequest }) =>
      api.post<MaterialBalanceCalculateResponse>(
        `/wells/${data.wellId}/material-balance/calculate`,
        data.payload,
      ),
  });
}

export function useMBAnalyses(wellId: string) {
  return useQuery({
    queryKey: ["material-balance", wellId],
    queryFn: () =>
      api.get<MaterialBalanceAnalysis[]>(
        `/wells/${wellId}/material-balance`,
      ),
    enabled: !!wellId,
  });
}

export function useSaveMBAnalysis(wellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MaterialBalanceCreate) =>
      api.post<MaterialBalanceAnalysis>(
        `/wells/${wellId}/material-balance`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["material-balance", wellId],
      });
    },
  });
}

export function useDeleteMBAnalysis(wellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (analysisId: string) =>
      api.del(`/wells/${wellId}/material-balance/${analysisId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["material-balance", wellId],
      });
    },
  });
}
