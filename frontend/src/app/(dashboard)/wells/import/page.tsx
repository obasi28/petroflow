"use client";

import { useRouter } from "next/navigation";
import { WellImportWizard } from "@/components/wells/well-import-wizard";

export default function ImportWellsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import Wells</h1>
        <p className="text-sm text-muted-foreground">
          Upload CSV/Excel and upsert wells by API number first, then UWI.
        </p>
      </div>

      <WellImportWizard onComplete={() => router.push("/wells")} />
    </div>
  );
}
