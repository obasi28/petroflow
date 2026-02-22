"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  Legend,
  Tooltip,
} from "recharts";
import {
  ChartContainer,
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
  ChartTooltip,
  chartColors,
} from "@/components/charts/base-chart";
import { Button } from "@/components/ui/button";
import type { ProductionRecord } from "@/types/production";

type ChartMode = "rate" | "cumulative";

interface ProductionChartProps {
  data: ProductionRecord[];
}

export function ProductionChart({ data }: ProductionChartProps) {
  const [mode, setMode] = useState<ChartMode>("rate");

  const chartData = data.map((record) => ({
    date: new Date(record.production_date).toLocaleDateString("en-US", {
      year: "2-digit",
      month: "short",
    }),
    oil: mode === "rate" ? record.oil_rate : record.cum_oil,
    gas: mode === "rate" ? record.gas_rate : record.cum_gas,
    water: mode === "rate" ? record.water_rate : record.cum_water,
  }));

  const yLabel = mode === "rate" ? "Rate (bbl/d or Mcf/d)" : "Cumulative";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {mode === "rate" ? "Production Rates" : "Cumulative Production"}
        </h3>
        <div className="flex gap-1">
          <Button
            variant={mode === "rate" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("rate")}
          >
            Rate
          </Button>
          <Button
            variant={mode === "cumulative" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("cumulative")}
          >
            Cumulative
          </Button>
        </div>
      </div>

      <div className="h-[350px]">
        <ChartContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <ChartGrid />
            <ChartXAxis dataKey="date" />
            <ChartYAxis label={{ value: yLabel, angle: -90, position: "insideLeft", offset: -5, style: { fontSize: 10, fill: "hsl(240, 5%, 64.9%)" } }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-sans)" }}
            />
            <Line
              type="monotone"
              dataKey="oil"
              name="Oil"
              stroke={chartColors.oil}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="gas"
              name="Gas"
              stroke={chartColors.gas}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="water"
              name="Water"
              stroke={chartColors.water}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
