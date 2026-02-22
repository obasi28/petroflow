"use client";

import { useMemo } from "react";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import { useDCAStore } from "@/stores/dca-store";
import type { ProductionRecord } from "@/types/production";
import type { DCAAnalysis } from "@/types/dca";
import { chartColors } from "@/components/charts/base-chart";

interface DCAChartProps {
  productionData: ProductionRecord[];
  analysis: DCAAnalysis | null;
}

export function DCAChart({ productionData, analysis }: DCAChartProps) {
  const { chartScale, showForecast } = useDCAStore();

  const traces = useMemo(() => {
    const plotTraces: Plotly.Data[] = [];

    // Actual production data
    if (productionData.length > 0) {
      const dates = productionData.map((r) => r.production_date);
      const rates = productionData.map((r) => r.oil_rate ?? 0);

      plotTraces.push({
        x: dates,
        y: rates,
        type: "scatter",
        mode: "markers",
        name: "Actual Production",
        marker: {
          color: chartColors.oil,
          size: 5,
          opacity: 0.8,
        },
      });
    }

    // Fitted curve + forecast
    if (analysis && analysis.forecast_points.length > 0) {
      const forecastDates = analysis.forecast_points.map((p) => p.forecast_date);

      // Find the split point between fit and forecast
      const endDate = analysis.end_date ? new Date(analysis.end_date) : null;

      const fitPoints = analysis.forecast_points.filter((p) => {
        const d = new Date(p.forecast_date);
        return endDate ? d <= endDate : true;
      });

      const forecastPoints = analysis.forecast_points.filter((p) => {
        const d = new Date(p.forecast_date);
        return endDate ? d > endDate : false;
      });

      // Fitted curve
      if (fitPoints.length > 0) {
        plotTraces.push({
          x: fitPoints.map((p) => p.forecast_date),
          y: fitPoints.map((p) => p.rate),
          type: "scatter",
          mode: "lines",
          name: `${analysis.model_type} Fit`,
          line: {
            color: chartColors.forecast,
            width: 2,
          },
        });
      }

      // Forecast
      if (showForecast && forecastPoints.length > 0) {
        plotTraces.push({
          x: forecastPoints.map((p) => p.forecast_date),
          y: forecastPoints.map((p) => p.rate),
          type: "scatter",
          mode: "lines",
          name: "Forecast",
          line: {
            color: chartColors.forecast,
            width: 2,
            dash: "dash",
          },
        });
      }

      // Economic limit line
      if (analysis.economic_limit) {
        const allDates = forecastDates;
        plotTraces.push({
          x: [allDates[0], allDates[allDates.length - 1]],
          y: [analysis.economic_limit, analysis.economic_limit],
          type: "scatter",
          mode: "lines",
          name: `Econ. Limit (${analysis.economic_limit} bbl/d)`,
          line: {
            color: "hsl(0, 72%, 51%)",
            width: 1,
            dash: "dot",
          },
        });
      }

      // Monte Carlo P10/P50/P90 bands
      if (analysis.monte_carlo_results) {
        const mc = analysis.monte_carlo_results;
        // Show P90 and P10 as horizontal reference lines
        const lastDate = forecastDates[forecastDates.length - 1];
        const firstDate = forecastDates[0];

        plotTraces.push({
          x: [firstDate, lastDate],
          y: [0, 0], // placeholder
          type: "scatter",
          mode: "none",
          name: `P90: ${mc.p90?.toFixed(0) || "--"} | P50: ${mc.p50?.toFixed(0) || "--"} | P10: ${mc.p10?.toFixed(0) || "--"} bbl`,
          showlegend: true,
        });
      }
    }

    return plotTraces;
  }, [productionData, analysis, showForecast]);

  const yAxisType = chartScale === "log-log" || chartScale === "semi-log" ? "log" : "linear";
  const xAxisType = chartScale === "log-log" ? "log" : undefined;

  return (
    <div className="h-[450px]">
      <PlotlyChart
        data={traces}
        layout={{
          xaxis: {
            title: { text: "Date", font: { size: 10 } },
            type: xAxisType as "date" | "log" | "linear" | undefined,
          },
          yaxis: {
            title: { text: "Rate (bbl/d)", font: { size: 10 } },
            type: yAxisType,
            rangemode: "tozero",
          },
          showlegend: true,
          legend: {
            x: 1,
            xanchor: "right",
            y: 1,
            bgcolor: "rgba(0,0,0,0.5)",
          },
          hovermode: "closest",
        }}
      />
    </div>
  );
}
