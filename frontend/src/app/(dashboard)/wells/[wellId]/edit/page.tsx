"use client";

import { useParams, useRouter } from "next/navigation";
import { useWell, useUpdateWell } from "@/hooks/use-wells";
import { WellForm } from "@/components/wells/well-form";
import type { WellCreateFormData } from "@/lib/validators";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function EditWellPage() {
  const params = useParams();
  const router = useRouter();
  const wellId = params.wellId as string;
  const { data, isLoading } = useWell(wellId);
  const updateWell = useUpdateWell(wellId);

  const well = data?.data;

  function normalizePayload(data: WellCreateFormData): WellCreateFormData {
    const cleanedEntries = Object.entries(data).filter(([, value]) => {
      if (value === "" || value === null || value === undefined) return false;
      if (typeof value === "number" && Number.isNaN(value)) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    });
    return Object.fromEntries(cleanedEntries) as WellCreateFormData;
  }

  async function onSubmit(data: WellCreateFormData) {
    try {
      const result = await updateWell.mutateAsync(normalizePayload(data));
      if (result.status === "success") {
        toast.success("Well updated successfully");
        router.push(`/wells/${wellId}`);
      } else {
        toast.error(result.errors?.[0]?.message || "Failed to update well");
      }
    } catch {
      toast.error("Failed to update well");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!well) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Well not found</p>
      </div>
    );
  }

  // Convert Well data to form defaults (nulls become undefined for the form)
  const defaultValues: Partial<WellCreateFormData> = {
    well_name: well.well_name,
    api_number: well.api_number ?? undefined,
    project_id: well.project_id ?? undefined,
    latitude: well.latitude ?? undefined,
    longitude: well.longitude ?? undefined,
    county: well.county ?? undefined,
    state_province: well.state_province ?? undefined,
    country: well.country,
    basin: well.basin ?? undefined,
    field_name: well.field_name ?? undefined,
    well_type: well.well_type,
    well_status: well.well_status,
    orientation: well.orientation,
    formation: well.formation ?? undefined,
    operator: well.operator ?? undefined,
    spud_date: well.spud_date ?? undefined,
    completion_date: well.completion_date ?? undefined,
    first_prod_date: well.first_prod_date ?? undefined,
    total_depth: well.total_depth ?? undefined,
    lateral_length: well.lateral_length ?? undefined,
    num_stages: well.num_stages ?? undefined,
    initial_pressure: well.initial_pressure ?? undefined,
    reservoir_temp: well.reservoir_temp ?? undefined,
    porosity: well.porosity ?? undefined,
    water_saturation: well.water_saturation ?? undefined,
    net_pay: well.net_pay ?? undefined,
    permeability: well.permeability ?? undefined,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit Well
        </h1>
        <p className="text-muted-foreground">
          Update {well.well_name} properties
        </p>
      </div>
      <WellForm
        onSubmit={onSubmit}
        isLoading={updateWell.isPending}
        defaultValues={defaultValues}
      />
    </div>
  );
}
