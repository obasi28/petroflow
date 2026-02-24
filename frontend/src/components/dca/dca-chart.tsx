"use client";

import { useMemo } from "react";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import { useDCAStore } from "@/stores/dca-store";
import type { ProductionRecord } from "@/types/production";
import {
  MODEL_LABELS,
  getFluidRateUnit,
  getFluidRateValue,
  type DCAAnalysis,
  type DCAAutoFitResult,
  type DCAModelType,
} from "@/types/dca";
import { chartColors } from "@/components/charts/base-chart";

interface DCAChartProps {
  productionData: ProductionRecord[];
  analysis: DCAAnalysis | null;
  autoFitResults: DCAAutoFitResult[];
  autoFitOverlayVisibility: Partial<Record<DCAModelType, boolean>>;
}

const AUTO_FIT_COLORS = [
  "hsl(280, 65%, 60%)",
  "hsl(190, 80%, 45%)",
  "hsl(45, 85%, 55%)",
  "hsl(330, 75%, 60%)",
  "hsl(110, 55%, 50%)",
  "hsl(15, 80%, 58%)",
];

export function DCAChart({
  productionData,
  analysis,
  autoFitResults,
  autoFitOverlayVisibility,
}: DCAChartProps) {
  const { chartScale, showForecast, selectedFluidType } = useDCAStore();
  const fluidType = selectedFluidType;
  const rateUnit = getFluidRateUnit(fluidType);
  const analysisMatchesFluid = analysis ? analysis.fluid_type === fluidType : false;

  const traces = useMemo(() => {
    const plotTraces: Plotly.Data[] = [];

    // Actual production data
    if (productionData.length > 0) {
      const dates = productionData.map((r) => r.production_date);
      const rates = productionData.map((r) => getFluidRateValue(fluidType, r));

      plotTraces.push({
        x: dates,
        y: rates,
        type: "scatter",
        mode: "markers",
        name: `${fluidType.toUpperCase()} Actual`,
        marker: {
          color: chartColors.oil,
          size: 5,
          opacity: 0.8,
        },
      });
    }

    // Fitted curve + forecast
    if (analysis && analysis.forecast_points.length > 0 && analysisMatchesFluid) {
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
          name: `${MODEL_LABELS[analysis.model_type]} Fit`,
          line: {
            color: chartColors.forecast,
            width: 2.5,
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
          name: `Econ. Limit (${analysis.economic_limit} ${rateUnit})`,
          line: {
            color: "hsl(0, 72%, 51%)",
            width: 1,
            dash: "dot",
          },
        });
      }
    }

    const sortedAutoFitResults = [...autoFitResults].sort((a, b) => a.aic - b.aic);
    sortedAutoFitResults.forEach((result, index) => {
      if (!autoFitOverlayVisibility[result.model_type]) {
        return;
      }
      if (!result.forecast_points || result.forecast_points.length === 0) {
        return;
      }
      plotTraces.push({
        x: result.forecast_points.map((p) => p.forecast_date),
        y: result.forecast_points.map((p) => p.rate),
        type: "scatter",
        mode: "lines",
        name: `Auto-Fit #${index + 1}: ${MODEL_LABELS[result.model_type]}`,
        line: {
          color: AUTO_FIT_COLORS[index % AUTO_FIT_COLORS.length],
          width: 1.5,
          dash: "dash",
        },
        opacity: 0.7,
      });
    });

    return plotTraces;
  }, [
    analysis,
    analysisMatchesFluid,
    autoFitOverlayVisibility,
    autoFitResults,
    fluidType,
    productionData,
    rateUnit,
    showForecast,
  ]);

  const yAxisType = chartScale === "log-log" || chartScale === "semi-log" ? "log" : "linear";
  const xAxisType = chartScale === "log-log" ? "log" : undefined;

  return (
    <div className="h-[450px]">
      <PlotlyChart
        data={traces}
        layout={{
          xaxis: {
            title: { text: "Date", font: { size: 10 } },
            type: xAxisType,
          },
          yaxis: {
            title: { text: `Rate (${rateUnit})`, font: { size: 10 } },
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
