"use client";

import { useParams, useRouter } from "next/navigation";
import { ImportWizard } from "@/components/production/import-wizard";

export default function ImportPage() {
  const params = useParams();
  const router = useRouter();
  const wellId = params.wellId as string;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Import Production Data</h3>
        <p className="text-sm text-muted-foreground">
          Upload a CSV or Excel file with monthly production records
        </p>
      </div>

      <ImportWizard
        wellId={wellId}
        onComplete={() => router.push(`/wells/${wellId}/production`)}
      />
    </div>
  );
}
