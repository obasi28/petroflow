"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductionStatistics } from "@/types/production";
import type { Well } from "@/types/well";
import { formatCumulative, formatRate, formatDate } from "@/lib/utils";

interface WellStatsCardsProps {
  stats: ProductionStatistics | null;
  isLoading: boolean;
  well?: Well | null;
}

export function WellStatsCards({ stats, isLoading, well }: WellStatsCardsProps) {
  const hasProduction = stats && stats.total_records > 0;

  // Production-based cards (shown when production data exists)
  const productionCards = [
    {
      label: "Current Oil Rate",
      value: hasProduction ? formatRate(stats.current_oil_rate) : "--",
      unit: "bbl/d",
      color: "text-[hsl(25,95%,53%)]",
    },
    {
      label: "Cumulative Oil",
      value: hasProduction ? formatCumulative(stats.cum_oil) : "--",
      unit: "",
      color: "text-[hsl(25,95%,53%)]",
    },
    {
      label: "Cumulative Gas",
      value: hasProduction ? formatCumulative(stats.cum_gas, "Mcf") : "--",
      unit: "",
      color: "text-[hsl(0,72%,51%)]",
    },
    {
      label: "Peak Oil Rate",
      value: hasProduction ? formatRate(stats.peak_oil_rate) : "--",
      unit: "bbl/d",
      color: "text-[hsl(25,95%,53%)]",
    },
    {
      label: "Avg. Oil Rate",
      value: hasProduction && stats.avg_oil_rate != null
        ? formatRate(stats.avg_oil_rate)
        : "--",
      unit: "bbl/d",
      color: "text-foreground",
    },
    {
      label: "Water Cut",
      value: hasProduction && stats.avg_water_cut != null
        ? `${(stats.avg_water_cut * 100).toFixed(1)}%`
        : "--",
      unit: "",
      color: "text-blue-500",
    },
    {
      label: "GOR",
      value: hasProduction && stats.avg_gor != null
        ? `${stats.avg_gor.toFixed(0)} scf/bbl`
        : "--",
      unit: "",
      color: "text-foreground",
    },
    {
      label: "Production History",
      value: hasProduction
        ? `${stats.total_records} months`
        : "No data",
      unit: hasProduction
        ? `${formatDate(stats.first_production_date)} → ${formatDate(stats.last_production_date)}`
        : "Import production data to see stats",
      color: "text-foreground",
    },
  ];

  // Well metadata cards (always visible from well properties)
  const wellCards = well
    ? [
        {
          label: "Total Depth",
          value: well.total_depth ? `${well.total_depth.toLocaleString()} ft` : "--",
          color: "text-foreground",
        },
        {
          label: "Lateral Length",
          value: well.lateral_length ? `${well.lateral_length.toLocaleString()} ft` : "--",
          color: "text-foreground",
        },
        {
          label: "Frac Stages",
          value: well.num_stages ? `${well.num_stages}` : "--",
          color: "text-foreground",
        },
        {
          label: "Initial Pressure",
          value: well.initial_pressure ? `${well.initial_pressure.toLocaleString()} psi` : "--",
          color: "text-foreground",
        },
      ]
    : [];

  return (
    <div className="space-y-3">
      {/* Production Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {productionCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-5 w-20" />
              ) : (
                <>
                  <p className={`text-sm font-semibold font-mono ${card.color}`}>
                    {card.value}
                  </p>
                  {card.unit && (
                    <p className="text-[10px] text-muted-foreground">{card.unit}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Well Metadata (always shows if well data provided) */}
      {wellCards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {wellCards.map((card) => (
            <Card key={card.label} className="border-dashed">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className={`text-sm font-semibold font-mono ${card.color}`}>
                  {card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
