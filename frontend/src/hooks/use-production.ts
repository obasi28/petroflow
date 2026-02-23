"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ProductionRecord, ProductionBatchCreate, ProductionStatistics, ProductionFilters } from "@/types/production";

export function useProduction(wellId: string, filters: ProductionFilters = {}) {
  return useQuery({
    queryKey: ["production", wellId, filters],
    queryFn: () =>
      api.get<ProductionRecord[]>(`/wells/${wellId}/production`, {
        start_date: filters.start_date,
        end_date: filters.end_date,
      }),
    enabled: !!wellId,
  });
}

export function useProductionStats(wellId: string) {
  return useQuery({
    queryKey: ["production-stats", wellId],
    queryFn: () => api.get<ProductionStatistics>(`/wells/${wellId}/production/statistics`),
    enabled: !!wellId,
  });
}

export function useBatchCreateProduction(wellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProductionBatchCreate) =>
      api.post(`/wells/${wellId}/production`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production", wellId] });
      queryClient.invalidateQueries({ queryKey: ["production-stats", wellId] });
    },
  });
}
