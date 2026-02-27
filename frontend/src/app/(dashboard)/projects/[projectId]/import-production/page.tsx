"use client";

import { useParams, useRouter } from "next/navigation";
import { BulkImportWizard } from "@/components/production/bulk-import-wizard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ImportProductionPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href={`/projects/${projectId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Import Production Data
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload CSV or Excel files with production data for multiple wells
          </p>
        </div>
      </div>

      <BulkImportWizard
        projectId={projectId}
        onComplete={() => router.push(`/projects/${projectId}`)}
      />
    </div>
  );
}
