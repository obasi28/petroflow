"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Well, WellCreate, WellUpdate, WellFilters } from "@/types/well";

export function useWells(filters: WellFilters = {}) {
  return useQuery({
    queryKey: ["wells", filters],
    queryFn: () =>
      api.get<Well[]>("/wells", {
        page: filters.page,
        per_page: filters.per_page,
        project_id: filters.project_id,
        status: filters.well_status,
        basin: filters.basin,
        search: filters.search,
      }),
  });
}

export function useWell(wellId: string) {
  return useQuery({
    queryKey: ["wells", wellId],
    queryFn: () => api.get<Well>(`/wells/${wellId}`),
    enabled: !!wellId,
  });
}

export function useCreateWell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WellCreate) => api.post<Well>("/wells", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wells"] });
    },
  });
}

export function useUpdateWell(wellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WellUpdate) => api.put<Well>(`/wells/${wellId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wells"] });
      queryClient.invalidateQueries({ queryKey: ["wells", wellId] });
    },
  });
}

export function useDeleteWell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (wellId: string) => api.del(`/wells/${wellId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wells"] });
    },
  });
}
