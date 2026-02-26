"use client";

import { useWells } from "@/hooks/use-wells";
import { useDashboardKPIs, useDashboardProductionSummary } from "@/hooks/use-dashboard";
import { KPICard } from "@/components/dashboard/kpi-card";
import { RecentWellsList } from "@/components/dashboard/recent-wells-list";
import { ProductionSummaryChart } from "@/components/dashboard/production-summary-chart";
import { Droplets, Activity, TrendingUp, BarChart3 } from "lucide-react";

function formatRate(value: number | null | undefined): string {
  if (value == null) return "--";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(0);
}

function formatEUR(value: number | null | undefined): string {
  if (value == null) return "--";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M bbl`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k bbl`;
  return `${value.toFixed(0)} bbl`;
}

export default function DashboardPage() {
  const { data: wellsData } = useWells({ per_page: 100 });
  const { data: kpisData } = useDashboardKPIs();
  const { data: prodSummary } = useDashboardProductionSummary();

  const wells = wellsData?.data || [];
  const kpis = kpisData?.data;
  const summaryData = prodSummary?.data || [];

  const totalWells = kpis?.total_wells ?? wells.length;
  const activeWells = kpis?.active_wells ?? wells.filter((w) => w.well_status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your reservoir engineering portfolio
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Wells"
          value={totalWells.toString()}
          description="Across all projects"
          icon={Droplets}
        />
        <KPICard
          title="Active Wells"
          value={activeWells.toString()}
          description="Currently producing"
          icon={Activity}
        />
        <KPICard
          title="Avg. Oil Rate"
          value={formatRate(kpis?.avg_oil_rate)}
          description="bbl/d average"
          icon={TrendingUp}
          trend={
            kpis?.oil_trend != null
              ? { value: kpis.oil_trend, label: "vs last month" }
              : undefined
          }
        />
        <KPICard
          title="Total EUR"
          value={formatEUR(kpis?.total_eur)}
          description="Estimated ultimate recovery"
          icon={BarChart3}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RecentWellsList wells={wells} />
        <ProductionSummaryChart data={summaryData} />
      </div>
    </div>
  );
}
