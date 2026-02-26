"use client";

import { useMemo } from "react";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import type { MaterialBalanceCalculateResponse } from "@/types/material-balance";

interface MaterialBalanceChartProps {
  result: MaterialBalanceCalculateResponse;
  mode?: "f_vs_et" | "campbell";
}

export function MaterialBalanceChart({
  result,
  mode = "f_vs_et",
}: MaterialBalanceChartProps) {
  const { data, layout } = useMemo(() => {
    if (mode === "f_vs_et") {
      return buildFvsEtChart(result);
    }
    return buildCampbellChart(result);
  }, [result, mode]);

  return (
    <PlotlyChart
      data={data}
      layout={layout}
      className="h-[380px] w-full"
    />
  );
}

function buildFvsEtChart(
  result: MaterialBalanceCalculateResponse,
): { data: Plotly.Data[]; layout: Partial<Plotly.Layout> } {
  const plotData = result.plot_data.f_vs_et;
  const traces: Plotly.Data[] = [];

  if (plotData) {
    // Scatter data points
    traces.push({
      x: plotData.Et,
      y: plotData.F,
      name: "F vs Et",
      type: "scatter" as const,
      mode: "markers" as const,
      marker: {
        color: "hsl(210, 100%, 52%)",
        size: 8,
        symbol: "circle",
      },
      hovertemplate:
        "Et: %{x:.4e}<br>F: %{y:.4e}<extra></extra>",
    });

    // Regression line overlay
    if (plotData.regression_line) {
      const reg = plotData.regression_line;
      traces.push({
        x: reg.x,
        y: reg.y,
        name: `Fit (R\u00B2=${reg.r_squared.toFixed(4)})`,
        type: "scatter" as const,
        mode: "lines" as const,
        line: {
          color: "hsl(0, 72%, 51%)",
          width: 2,
          dash: "dash" as const,
        },
        hovertemplate:
          "Et: %{x:.4e}<br>F: %{y:.4e}<extra></extra>",
      });
    }
  }

  return {
    data: traces,
    layout: {
      title: {
        text: "Havlena-Odeh: F vs Et",
        font: { size: 13 },
      },
      xaxis: {
        title: {
          text: "Et (rb/stb)",
          font: { size: 11 },
        },
      },
      yaxis: {
        title: {
          text: "F (rb)",
          font: { size: 11 },
        },
      },
      legend: { orientation: "h" as const, y: -0.18 },
      margin: { t: 40, r: 20, b: 70, l: 80 },
    },
  };
}

function buildCampbellChart(
  result: MaterialBalanceCalculateResponse,
): { data: Plotly.Data[]; layout: Partial<Plotly.Layout> } {
  const plotData = result.plot_data.campbell;
  const traces: Plotly.Data[] = [];

  if (plotData) {
    traces.push({
      x: plotData.np,
      y: plotData.f_over_et,
      name: "F/Et vs Np",
      type: "scatter" as const,
      mode: "lines+markers" as const,
      marker: {
        color: "hsl(25, 95%, 53%)",
        size: 8,
        symbol: "diamond",
      },
      line: {
        color: "hsl(25, 95%, 53%)",
        width: 1.5,
      },
      hovertemplate:
        "Np: %{x:,.0f} stb<br>F/Et: %{y:,.0f} stb<extra></extra>",
    });
  }

  return {
    data: traces,
    layout: {
      title: {
        text: "Campbell Plot: F/Et vs Np",
        font: { size: 13 },
      },
      xaxis: {
        title: {
          text: "Cumulative Oil Production, Np (stb)",
          font: { size: 11 },
        },
      },
      yaxis: {
        title: {
          text: "F / Et (stb)",
          font: { size: 11 },
        },
      },
      legend: { orientation: "h" as const, y: -0.18 },
      margin: { t: 40, r: 20, b: 70, l: 80 },
    },
  };
}
