"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface DeclineRateChartProps {
  dates: string[];
  declineRate: (number | null)[];
  oilRate: number[];
}

export function DeclineRateChart({ dates, declineRate, oilRate }: DeclineRateChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Decline Rate Monitoring</CardTitle>
      </CardHeader>
      <CardContent>
        <Plot
          data={[
            {
              x: dates,
              y: oilRate,
              name: "Oil Rate",
              type: "scatter" as const,
              mode: "lines" as const,
              line: { width: 1.5, color: "#22c55e" },
              yaxis: "y",
            },
            {
              x: dates,
              y: declineRate.map((v) => (v !== null ? v * 100 : null)),
              name: "Decline Rate %",
              type: "bar" as const,
              marker: {
                color: declineRate.map((v) =>
                  v !== null && v > 0
                    ? "rgba(239,68,68,0.5)"
                    : "rgba(34,197,94,0.3)"
                ),
              },
              yaxis: "y2",
            },
          ]}
          layout={{
            height: 320,
            margin: { l: 60, r: 60, t: 10, b: 40 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: "#a1a1aa", size: 10 },
            legend: { orientation: "h" as const, y: -0.15, font: { size: 9 } },
            xaxis: {
              gridcolor: "#27272a",
              tickfont: { size: 9 },
            },
            yaxis: {
              title: { text: "Oil Rate (STB/d)", font: { size: 10 } },
              gridcolor: "#27272a",
              tickfont: { size: 9 },
              side: "left" as const,
            },
            yaxis2: {
              title: { text: "Decline Rate (%)", font: { size: 10 } },
              overlaying: "y" as const,
              side: "right" as const,
              gridcolor: "transparent",
              tickfont: { size: 9 },
            },
            bargap: 0.3,
          }}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
          className="w-full"
        />
      </CardContent>
    </Card>
  );
}
