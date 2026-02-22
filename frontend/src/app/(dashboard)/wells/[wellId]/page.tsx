"use client";

import { useParams } from "next/navigation";
import { useProductionStats } from "@/hooks/use-production";
import { WellStatsCards } from "@/components/wells/well-stats-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WellOverviewPage() {
  const params = useParams();
  const wellId = params.wellId as string;
  const { data: statsData, isLoading } = useProductionStats(wellId);
  const stats = statsData?.data || null;

  return (
    <div className="space-y-6">
      <WellStatsCards stats={stats} isLoading={isLoading} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats && stats.total_records > 0
                ? `${stats.total_records} production records from ${stats.first_production_date} to ${stats.last_production_date}`
                : "No production data. Import data from the Import tab."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">DCA Analyses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Run decline curve analysis from the DCA tab.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
