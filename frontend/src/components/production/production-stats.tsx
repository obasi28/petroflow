"use client";

import type { ProductionStatistics } from "@/types/production";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatRate, formatCumulative, formatDate } from "@/lib/utils";

interface ProductionStatsProps {
  stats: ProductionStatistics;
}

export function ProductionStats({ stats }: ProductionStatsProps) {
  const statItems = [
    { label: "Peak Oil Rate", value: formatRate(stats.peak_oil_rate), color: "text-[hsl(25,95%,53%)]" },
    { label: "Peak Gas Rate", value: stats.peak_gas_rate ? `${stats.peak_gas_rate.toFixed(0)} Mcf/d` : "--", color: "text-[hsl(0,72%,51%)]" },
    { label: "Current Oil Rate", value: formatRate(stats.current_oil_rate), color: "text-[hsl(25,95%,53%)]" },
    { label: "Current Gas Rate", value: stats.current_gas_rate ? `${stats.current_gas_rate.toFixed(0)} Mcf/d` : "--", color: "text-[hsl(0,72%,51%)]" },
  ];

  const cumulativeItems = [
    { label: "Cum Oil", value: formatCumulative(stats.cum_oil), color: "text-[hsl(25,95%,53%)]" },
    { label: "Cum Gas", value: formatCumulative(stats.cum_gas, "Mcf"), color: "text-[hsl(0,72%,51%)]" },
    { label: "Cum Water", value: formatCumulative(stats.cum_water), color: "text-[hsl(210,100%,52%)]" },
  ];

  const averages = [
    { label: "Avg Oil Rate", value: formatRate(stats.avg_oil_rate) },
    { label: "Avg Gas Rate", value: stats.avg_gas_rate ? `${stats.avg_gas_rate.toFixed(0)} Mcf/d` : "--" },
    { label: "Avg Water Cut", value: stats.avg_water_cut != null ? `${(stats.avg_water_cut * 100).toFixed(1)}%` : "--" },
    { label: "Avg GOR", value: stats.avg_gor ? `${stats.avg_gor.toFixed(0)} scf/bbl` : "--" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-xs">
          <p className="text-muted-foreground">
            {stats.total_records} records
          </p>
          <p className="text-muted-foreground">
            {formatDate(stats.first_production_date)} — {formatDate(stats.last_production_date)}
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rates</p>
          {statItems.map((item) => (
            <div key={item.label} className="flex justify-between">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className={`text-xs font-mono font-medium ${item.color}`}>{item.value}</span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cumulative</p>
          {cumulativeItems.map((item) => (
            <div key={item.label} className="flex justify-between">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className={`text-xs font-mono font-medium ${item.color}`}>{item.value}</span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Averages</p>
          {averages.map((item) => (
            <div key={item.label} className="flex justify-between">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs font-mono font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
