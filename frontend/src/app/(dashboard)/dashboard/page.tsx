"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useWells } from "@/hooks/use-wells";
import { useProjects } from "@/hooks/use-projects";
import { useDashboardKPIs, useDashboardProductionSummary } from "@/hooks/use-dashboard";
import { KPICard } from "@/components/dashboard/kpi-card";
import { RecentWellsList } from "@/components/dashboard/recent-wells-list";
import { ProductionSummaryChart } from "@/components/dashboard/production-summary-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Droplets, Activity, TrendingUp, BarChart3, FolderKanban,
  MapPin, Layers, Plus,
} from "lucide-react";

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
  const { data: wellsData } = useWells({ per_page: 200 });
  const { data: projectsData } = useProjects();
  const { data: kpisData } = useDashboardKPIs();
  const { data: prodSummary } = useDashboardProductionSummary();

  const wells = wellsData?.data || [];
  const projects = projectsData?.data || [];
  const kpis = kpisData?.data;
  const summaryData = prodSummary?.data || [];

  // Compute client-side KPIs from wells data (always accurate)
  const wellKPIs = useMemo(() => {
    const total = wells.length;
    const active = wells.filter((w) => w.well_status === "active").length;
    const shutIn = wells.filter((w) => w.well_status === "shut_in").length;
    const drilling = wells.filter((w) => w.well_status === "drilling").length;
    const horizontal = wells.filter((w) => w.orientation === "horizontal").length;

    // Basin distribution
    const basinCounts: Record<string, number> = {};
    wells.forEach((w) => {
      const basin = w.basin || "Unassigned";
      basinCounts[basin] = (basinCounts[basin] || 0) + 1;
    });

    // Type distribution
    const typeCounts: Record<string, number> = {};
    wells.forEach((w) => {
      typeCounts[w.well_type] = (typeCounts[w.well_type] || 0) + 1;
    });

    return { total, active, shutIn, drilling, horizontal, basinCounts, typeCounts };
  }, [wells]);

  // Use server KPIs when available, fallback to client-computed
  const totalWells = kpis?.total_wells ?? wellKPIs.total;
  const activeWells = kpis?.active_wells ?? wellKPIs.active;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your reservoir engineering portfolio
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/wells/new">
              <Plus className="mr-2 h-4 w-4" />
              New Well
            </Link>
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Wells"
          value={totalWells.toString()}
          description={`${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          icon={Droplets}
        />
        <KPICard
          title="Active Wells"
          value={activeWells.toString()}
          description={
            wellKPIs.shutIn > 0
              ? `${wellKPIs.shutIn} shut-in, ${wellKPIs.drilling} drilling`
              : "Currently producing"
          }
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

      {/* Secondary KPI Cards (from wells data - always show) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Projects"
          value={projects.length.toString()}
          description="Organized well groups"
          icon={FolderKanban}
        />
        <KPICard
          title="Basins"
          value={Object.keys(wellKPIs.basinCounts).length.toString()}
          description={
            Object.keys(wellKPIs.basinCounts).length > 0
              ? Object.entries(wellKPIs.basinCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 2)
                  .map(([basin, count]) => `${basin} (${count})`)
                  .join(", ")
              : "No wells yet"
          }
          icon={MapPin}
        />
        <KPICard
          title="Horizontal Wells"
          value={wellKPIs.horizontal.toString()}
          description={
            totalWells > 0
              ? `${((wellKPIs.horizontal / totalWells) * 100).toFixed(0)}% of portfolio`
              : "No wells yet"
          }
          icon={Layers}
        />
        <KPICard
          title="Primary Type"
          value={
            Object.entries(wellKPIs.typeCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type]) => type.replace("_", "/"))
              .slice(0, 1)[0] || "--"
          }
          description={
            Object.entries(wellKPIs.typeCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => `${type.replace("_", "/")}: ${count}`)
              .join(", ") || "No wells yet"
          }
          icon={Droplets}
        />
      </div>

      {/* Wells & Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <RecentWellsList wells={wells} />
        <ProductionSummaryChart data={summaryData} />
      </div>

      {/* Basin & Status Distribution (if there are wells) */}
      {wells.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Wells by Basin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(wellKPIs.basinCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([basin, count]) => (
                    <div key={basin} className="flex items-center justify-between">
                      <span className="text-sm">{basin}</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 rounded-full bg-primary/20"
                          style={{ width: `${Math.max(20, (count / totalWells) * 200)}px` }}
                        >
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${(count / totalWells) * 100}%` }}
                          />
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {count}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Wells by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: "Active", value: wellKPIs.active, color: "bg-green-500" },
                  { label: "Shut In", value: wellKPIs.shutIn, color: "bg-yellow-500" },
                  { label: "Drilling", value: wellKPIs.drilling, color: "bg-blue-500" },
                  {
                    label: "Other",
                    value: totalWells - wellKPIs.active - wellKPIs.shutIn - wellKPIs.drilling,
                    color: "bg-gray-400",
                  },
                ]
                  .filter((s) => s.value > 0)
                  .map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                        <span className="text-sm">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium">{s.value}</span>
                        <span className="text-xs text-muted-foreground">
                          ({totalWells > 0 ? ((s.value / totalWells) * 100).toFixed(0) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
