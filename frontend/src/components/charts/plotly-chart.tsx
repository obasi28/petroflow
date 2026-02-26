"use client";

import dynamic from "next/dynamic";
import type { PlotParams } from "react-plotly.js";
import { Skeleton } from "@/components/ui/skeleton";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

const darkLayout: Partial<Plotly.Layout> = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: {
    family: "Inter, system-ui, sans-serif",
    size: 11,
    color: "hsl(240, 5%, 64.9%)",
  },
  xaxis: {
    gridcolor: "hsl(240, 3.7%, 15.9%)",
    zerolinecolor: "hsl(240, 3.7%, 15.9%)",
    linecolor: "hsl(240, 3.7%, 15.9%)",
  },
  yaxis: {
    gridcolor: "hsl(240, 3.7%, 15.9%)",
    zerolinecolor: "hsl(240, 3.7%, 15.9%)",
    linecolor: "hsl(240, 3.7%, 15.9%)",
  },
  margin: { t: 30, r: 20, b: 50, l: 60 },
  legend: {
    bgcolor: "transparent",
    font: { size: 10 },
  },
  modebar: {
    bgcolor: "transparent",
    color: "hsl(240, 5%, 64.9%)",
    activecolor: "hsl(210, 100%, 52%)",
  },
};

interface PlotlyChartProps extends Omit<PlotParams, "layout"> {
  layout?: Partial<Plotly.Layout>;
  className?: string;
}

export function PlotlyChart({ data, layout, config, className, ...rest }: PlotlyChartProps) {
  const mergedLayout: Partial<Plotly.Layout> = {
    ...darkLayout,
    ...layout,
    xaxis: { ...darkLayout.xaxis, ...layout?.xaxis },
    yaxis: { ...darkLayout.yaxis, ...layout?.yaxis },
    // Support dual Y-axis charts (PVT, etc.)
    ...((layout as Record<string, unknown>)?.yaxis2
      ? { yaxis2: { ...darkLayout.yaxis, ...(layout as Record<string, unknown>).yaxis2 as object } }
      : {}),
  };

  const mergedConfig: Partial<Plotly.Config> = {
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: ["lasso2d", "select2d", "sendDataToCloud"] as Plotly.ModeBarDefaultButtons[],
    ...config,
  };

  return (
    <div className={className || "h-full w-full"}>
      <Plot
        data={data}
        layout={mergedLayout}
        config={mergedConfig}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
        {...rest}
      />
    </div>
  );
}
