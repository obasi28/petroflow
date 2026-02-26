"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface WORGORChartProps {
  dates: string[];
  gor: (number | null)[];
  wor: (number | null)[];
  waterCut: (number | null)[];
}

export function WORGORChart({ dates, gor, wor, waterCut }: WORGORChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">GOR & WOR Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <Plot
          data={[
            {
              x: dates,
              y: gor,
              name: "GOR",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              marker: { size: 3, color: "#f97316" },
              line: { width: 1.5, color: "#f97316" },
              yaxis: "y",
            },
            {
              x: dates,
              y: wor,
              name: "WOR",
              type: "scatter" as const,
              mode: "lines+markers" as const,
              marker: { size: 3, color: "#3b82f6" },
              line: { width: 1.5, color: "#3b82f6" },
              yaxis: "y2",
            },
            {
              x: dates,
              y: waterCut.map((v) => (v !== null ? v * 100 : null)),
              name: "Water Cut %",
              type: "scatter" as const,
              mode: "lines" as const,
              line: { width: 1, dash: "dot" as const, color: "#6366f1" },
              yaxis: "y2",
              visible: "legendonly" as const,
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
              title: { text: "GOR (scf/STB)", font: { size: 10 } },
              gridcolor: "#27272a",
              tickfont: { size: 9 },
              side: "left" as const,
            },
            yaxis2: {
              title: { text: "WOR / Water Cut", font: { size: 10 } },
              overlaying: "y" as const,
              side: "right" as const,
              gridcolor: "transparent",
              tickfont: { size: 9 },
            },
          }}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
          className="w-full"
        />
      </CardContent>
    </Card>
  );
}
