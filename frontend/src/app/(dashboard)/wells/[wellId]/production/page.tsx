"use client";

import { useParams } from "next/navigation";
import { useProduction, useProductionStats } from "@/hooks/use-production";
import { ProductionChart } from "@/components/production/production-chart";
import { ProductionTable } from "@/components/production/production-table";
import { ProductionStats } from "@/components/production/production-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ProductionPage() {
  const params = useParams();
  const wellId = params.wellId as string;

  const { data: prodData, isLoading: prodLoading } = useProduction(wellId, { per_page: 1000 });
  const { data: statsData } = useProductionStats(wellId);

  const records = prodData?.data || [];
  const stats = statsData?.data;

  if (prodLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[350px] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground">No production data available.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Go to the Import tab to upload production data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <ProductionChart data={records} />
        <ProductionTable data={records} />
      </div>

      <div>{stats && <ProductionStats stats={stats} />}</div>
    </div>
  );
}
