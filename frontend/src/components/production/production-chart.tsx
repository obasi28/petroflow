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
    oil: mode === "rate" ? (record.oil_rate ?? null) : (record.cum_oil ?? null),
    gas: mode === "rate" ? (record.gas_rate ?? null) : (record.cum_gas ?? null),
    water: mode === "rate" ? (record.water_rate ?? null) : (record.cum_water ?? null),
  }));

  const liquidsUnit = mode === "rate" ? "bbl/d" : "bbl";
  const gasUnit = mode === "rate" ? "Mcf/d" : "Mcf";

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
            <ChartYAxis
              yAxisId="liquid"
              label={{
                value: `Liquids (${liquidsUnit})`,
                angle: -90,
                position: "insideLeft",
                offset: -5,
                style: { fontSize: 10, fill: "hsl(240, 5%, 64.9%)" },
              }}
            />
            <ChartYAxis
              yAxisId="gas"
              orientation="right"
              label={{
                value: `Gas (${gasUnit})`,
                angle: 90,
                position: "insideRight",
                offset: -2,
                style: { fontSize: 10, fill: "hsl(240, 5%, 64.9%)" },
              }}
            />
            <Tooltip
              formatter={(value, name) => {
                const unit = name === "Gas" ? gasUnit : liquidsUnit;
                if (typeof value === "number") {
                  return [`${value.toFixed(1)} ${unit}`, name];
                }
                return [value, name];
              }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(240, 3.7%, 15.9%)",
                backgroundColor: "hsl(224, 71%, 4%)",
                fontSize: 11,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-sans)" }}
            />
            <Line
              type="monotone"
              dataKey="oil"
              name="Oil"
              yAxisId="liquid"
              stroke={chartColors.oil}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="gas"
              name="Gas"
              yAxisId="gas"
              stroke={chartColors.gas}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="water"
              name="Water"
              yAxisId="liquid"
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
