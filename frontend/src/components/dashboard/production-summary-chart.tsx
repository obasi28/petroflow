"use client";

import { AreaChart, Area, Legend, Tooltip } from "recharts";
import {
  ChartContainer,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  chartColors,
} from "@/components/charts/base-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductionSummaryChartProps {
  data: Array<{
    date: string;
    oil: number;
    gas: number;
    water: number;
  }>;
}

export function ProductionSummaryChart({ data }: ProductionSummaryChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Production Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4">
            Import production data to see a summary chart.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Production Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ChartContainer>
            <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <ChartGrid />
              <ChartXAxis dataKey="date" />
              <ChartYAxis />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="oil"
                name="Oil"
                stackId="1"
                stroke={chartColors.oil}
                fill={chartColors.oil}
                fillOpacity={0.3}
              />
              <Area
                type="monotone"
                dataKey="gas"
                name="Gas"
                stackId="2"
                stroke={chartColors.gas}
                fill={chartColors.gas}
                fillOpacity={0.2}
              />
              <Area
                type="monotone"
                dataKey="water"
                name="Water"
                stackId="3"
                stroke={chartColors.water}
                fill={chartColors.water}
                fillOpacity={0.15}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
