"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { DashboardKPIs, ProductionSummaryPoint } from "@/types/dashboard";

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: () => api.get<DashboardKPIs>("/dashboard/kpis"),
    refetchInterval: 60_000,
  });
}

export function useDashboardProductionSummary(months: number = 24) {
  return useQuery({
    queryKey: ["dashboard", "production-summary", months],
    queryFn: () =>
      api.get<ProductionSummaryPoint[]>("/dashboard/production-summary", { months }),
  });
}
