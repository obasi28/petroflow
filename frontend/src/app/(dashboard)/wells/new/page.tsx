"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCreateWell } from "@/hooks/use-wells";
import { WellForm } from "@/components/wells/well-form";
import type { WellCreateFormData } from "@/lib/validators";
import { toast } from "sonner";

export default function NewWellPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultProjectId = searchParams.get("project_id") || undefined;
  const createWell = useCreateWell();

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
    const result = await createWell.mutateAsync(normalizePayload(data));
    if (result.status === "success" && result.data) {
      toast.success("Well created successfully");
      router.push(`/wells/${result.data.id}`);
    } else {
      toast.error(result.errors?.[0]?.message || "Failed to create well");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Well</h1>
        <p className="text-muted-foreground">
          Add a new well to your inventory
        </p>
      </div>
      <WellForm
        onSubmit={onSubmit}
        isLoading={createWell.isPending}
        defaultValues={defaultProjectId ? { project_id: defaultProjectId } : undefined}
      />
    </div>
  );
}
