"use client";

import { useParams } from "next/navigation";
import { useProductionAnalytics } from "@/hooks/use-production";
import { WORGORChart } from "./wor-gor-chart";
import { DeclineRateChart } from "./decline-rate-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingDown, Droplets, Flame } from "lucide-react";

export function ProductionAnalytics() {
  const params = useParams();
  const wellId = params.wellId as string;
  const { data, isLoading } = useProductionAnalytics(wellId);
  const analytics = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[300px] rounded-lg" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    );
  }

  if (!analytics || analytics.dates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Activity className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">
            No production data available for analytics.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Import production data first to see WOR, GOR, and decline analysis.
          </p>
        </CardContent>
      </Card>
    );
  }

  const summary = analytics.summary;

  return (
    <div className="space-y-4">
      {/* Summary KPI Cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Peak Oil Rate
            </CardTitle>
            <Flame className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {summary.peak_oil_rate?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">STB/d</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Current Oil Rate
            </CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {summary.current_oil_rate?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">STB/d</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Decline Rate
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {(summary.avg_decline_rate * 100)?.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Cumulative Oil
            </CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {summary.total_cum_oil?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">STB</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <WORGORChart
          dates={analytics.dates}
          gor={analytics.gor}
          wor={analytics.wor}
          waterCut={analytics.water_cut}
        />
        <DeclineRateChart
          dates={analytics.dates}
          declineRate={analytics.decline_rate}
          oilRate={analytics.oil_rate}
        />
      </div>
    </div>
  );
}
