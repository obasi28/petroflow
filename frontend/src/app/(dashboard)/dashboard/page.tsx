"use client";

import { useWells } from "@/hooks/use-wells";
import { KPICard } from "@/components/dashboard/kpi-card";
import { RecentWellsList } from "@/components/dashboard/recent-wells-list";
import { ProductionSummaryChart } from "@/components/dashboard/production-summary-chart";
import { Droplets, Activity, TrendingUp, BarChart3 } from "lucide-react";

export default function DashboardPage() {
  const { data: wellsData } = useWells({ per_page: 100 });
  const wells = wellsData?.data || [];

  const totalWells = wellsData?.meta?.total || wells.length;
  const activeWells = wells.filter((w) => w.well_status === "active").length;

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
          value="--"
          description="bbl/d average"
          icon={TrendingUp}
        />
        <KPICard
          title="Total EUR"
          value="--"
          description="Estimated ultimate recovery"
          icon={BarChart3}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RecentWellsList wells={wells} />
        <ProductionSummaryChart data={[]} />
      </div>
    </div>
  );
}
