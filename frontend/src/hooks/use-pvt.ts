"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  PVTCalculateRequest,
  PVTCalculateResponse,
  PVTStudy,
  PVTStudyCreate,
} from "@/types/pvt";

export function useCalculatePVT() {
  return useMutation({
    mutationFn: (data: PVTCalculateRequest) =>
      api.post<PVTCalculateResponse>("/pvt/calculate", data),
  });
}

export function usePVTStudies(wellId: string) {
  return useQuery({
    queryKey: ["pvt", wellId],
    queryFn: () => api.get<PVTStudy[]>(`/wells/${wellId}/pvt`),
    enabled: !!wellId,
  });
}

export function useSavePVTStudy(wellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PVTStudyCreate) =>
      api.post<PVTStudy>(`/wells/${wellId}/pvt`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pvt", wellId] });
    },
  });
}

export function useDeletePVTStudy(wellId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studyId: string) =>
      api.del(`/wells/${wellId}/pvt/${studyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pvt", wellId] });
    },
  });
}
