"use client";

import { useParams } from "next/navigation";
import { useWell } from "@/hooks/use-wells";
import { useProduction, useProductionStats } from "@/hooks/use-production";
import { useDCAAnalyses } from "@/hooks/use-dca";
import { WellStatsCards } from "@/components/wells/well-stats-cards";
import { WellOverviewSparkline } from "@/components/wells/well-overview-sparkline";
import { WellReservoirParams } from "@/components/wells/well-reservoir-params";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MODEL_LABELS } from "@/types/dca";

export default function WellOverviewPage() {
  const params = useParams();
  const wellId = params.wellId as string;

  const { data: wellData } = useWell(wellId);
  const { data: statsData, isLoading: statsLoading } = useProductionStats(wellId);
  const { data: prodData, isLoading: prodLoading } = useProduction(wellId);
  const { data: dcaData } = useDCAAnalyses(wellId);

  const well = wellData?.data;
  const stats = statsData?.data || null;
  const records = prodData?.data || [];
  const dcaAnalyses = dcaData?.data || [];

  // Find the primary or latest DCA analysis
  const latestDCA =
    dcaAnalyses.find((a) => a.is_primary) ||
    (dcaAnalyses.length > 0 ? dcaAnalyses[dcaAnalyses.length - 1] : null);

  return (
    <div className="space-y-6">
      {/* Production Stats Row */}
      <WellStatsCards stats={stats} isLoading={statsLoading} well={well} />

      {/* Main content: 2-column layout */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left column: Sparkline + DCA Summary */}
        <div className="space-y-4">
          <WellOverviewSparkline records={records} isLoading={prodLoading} />

          {/* Latest DCA Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Latest DCA Analysis</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              {latestDCA ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Model
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">
                      {MODEL_LABELS[latestDCA.model_type] || latestDCA.model_type}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      R²
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold">
                      {latestDCA.r_squared != null ? latestDCA.r_squared.toFixed(4) : "--"}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      EUR
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-[hsl(25,95%,53%)]">
                      {latestDCA.eur != null
                        ? latestDCA.eur >= 1_000_000
                          ? `${(latestDCA.eur / 1_000_000).toFixed(2)}M bbl`
                          : `${(latestDCA.eur / 1_000).toFixed(0)}k bbl`
                        : "--"}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Remaining
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold">
                      {latestDCA.remaining_reserves != null
                        ? latestDCA.remaining_reserves >= 1_000_000
                          ? `${(latestDCA.remaining_reserves / 1_000_000).toFixed(2)}M bbl`
                          : `${(latestDCA.remaining_reserves / 1_000).toFixed(0)}k bbl`
                        : "--"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No DCA analysis yet. Run one from the DCA Analysis tab.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Reservoir + Completion */}
        {well && <WellReservoirParams well={well} />}
      </div>
    </div>
  );
}
