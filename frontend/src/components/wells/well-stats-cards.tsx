"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductionStatistics } from "@/types/production";
import { formatCumulative, formatRate } from "@/lib/utils";

interface WellStatsCardsProps {
  stats: ProductionStatistics | null;
  isLoading: boolean;
}

export function WellStatsCards({ stats, isLoading }: WellStatsCardsProps) {
  const cards = [
    {
      label: "Cumulative Oil",
      value: stats ? formatCumulative(stats.cum_oil) : "--",
      color: "text-[hsl(25,95%,53%)]",
    },
    {
      label: "Cumulative Gas",
      value: stats ? formatCumulative(stats.cum_gas, "Mcf") : "--",
      color: "text-[hsl(0,72%,51%)]",
    },
    {
      label: "Peak Oil Rate",
      value: stats ? formatRate(stats.peak_oil_rate) : "--",
      color: "text-[hsl(25,95%,53%)]",
    },
    {
      label: "Total Records",
      value: stats ? `${stats.total_records} months` : "--",
      color: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-5 w-20" />
            ) : (
              <p className={`text-sm font-semibold font-mono ${card.color}`}>
                {card.value}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
