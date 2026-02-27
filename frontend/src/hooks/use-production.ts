"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ProductionRecord, ProductionBatchCreate, ProductionStatistics, ProductionFilters, BulkProductionImportResult } from "@/types/production";

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
    refetchInterval: 30_000,
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
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useProductionAnalytics(wellId: string) {
  return useQuery({
    queryKey: ["production-analytics", wellId],
    queryFn: () => api.get<{
      dates: string[];
      oil_rate: number[];
      gas_rate: number[];
      water_rate: number[];
      cum_oil: number[];
      cum_gas: number[];
      cum_water: number[];
      gor: (number | null)[];
      wor: (number | null)[];
      water_cut: (number | null)[];
      decline_rate: (number | null)[];
      summary: Record<string, number>;
    }>(`/wells/${wellId}/production/analytics`),
    enabled: !!wellId,
  });
}

export function useDeleteProduction(wellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { start_date?: string; end_date?: string }) =>
      api.del(`/wells/${wellId}/production?${new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).filter(([, v]) => v != null) as [string, string][]
        )
      ).toString()}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production", wellId] });
      queryClient.invalidateQueries({ queryKey: ["production-stats", wellId] });
      queryClient.invalidateQueries({ queryKey: ["dca", wellId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useBulkProductionImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      api.upload<BulkProductionImportResult>("/imports/production/bulk", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production"] });
      queryClient.invalidateQueries({ queryKey: ["production-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["wells"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dca"] });
    },
  });
}
