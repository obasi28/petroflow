"use client";

import { useParams, useRouter } from "next/navigation";
import { WellImportWizard } from "@/components/wells/well-import-wizard";

export default function ProjectImportWellsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import Wells</h1>
        <p className="text-sm text-muted-foreground">
          Upload CSV or Excel to import wells into this project.
        </p>
      </div>
      <WellImportWizard
        projectId={projectId}
        onComplete={() => router.push(`/projects/${projectId}`)}
      />
    </div>
  );
}
