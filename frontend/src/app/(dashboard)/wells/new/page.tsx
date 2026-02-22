"use client";

import { useRouter } from "next/navigation";
import { useCreateWell } from "@/hooks/use-wells";
import { WellForm } from "@/components/wells/well-form";
import type { WellCreateFormData } from "@/lib/validators";
import { toast } from "sonner";

export default function NewWellPage() {
  const router = useRouter();
  const createWell = useCreateWell();

  async function onSubmit(data: WellCreateFormData) {
    const result = await createWell.mutateAsync(data);
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
      <WellForm onSubmit={onSubmit} isLoading={createWell.isPending} />
    </div>
  );
}
