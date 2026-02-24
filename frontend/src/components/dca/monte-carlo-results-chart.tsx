"use client";

import { useMemo } from "react";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import { getFluidCumulativeUnit, type FluidType, type MonteCarloResults } from "@/types/dca";

interface MonteCarloResultsChartProps {
  fluidType: FluidType;
  results: MonteCarloResults;
}

const DEFAULT_BIN_COUNT = 24;

function histogramFromSample(values: number[], binCount = DEFAULT_BIN_COUNT): { bins: number[]; counts: number[] } {
  if (values.length === 0) {
    return { bins: [], counts: [] };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max <= min) {
    return { bins: [min, max || min + 1], counts: [values.length] };
  }

  const width = (max - min) / binCount;
  const bins = Array.from({ length: binCount + 1 }, (_, i) => min + i * width);
  const counts = new Array(binCount).fill(0);
  values.forEach((value) => {
    const idx = Math.min(binCount - 1, Math.floor((value - min) / width));
    counts[idx] += 1;
  });

  return { bins, counts };
}

export function MonteCarloResultsChart({ fluidType, results }: MonteCarloResultsChartProps) {
  const chartData = useMemo(() => {
    const sourceBins = results.histogram_bins || [];
    const sourceCounts = results.histogram_counts || [];
    const fallbackSample = results.eur_distribution_sample || results.eur_distribution || [];

    const histogram =
      sourceBins.length >= 2 && sourceCounts.length >= 1
        ? { bins: sourceBins, counts: sourceCounts }
        : histogramFromSample(fallbackSample);

    if (histogram.bins.length < 2 || histogram.counts.length === 0) {
      return null;
    }

    const xMidpoints = histogram.counts.map((_, i) => (histogram.bins[i] + histogram.bins[i + 1]) / 2);
    const cumulative = histogram.counts.reduce<number[]>((acc, count, index) => {
      const prev = index > 0 ? acc[index - 1] : 0;
      acc.push(prev + count);
      return acc;
    }, []);
    const total = cumulative[cumulative.length - 1] || 1;
    const cdf = cumulative.map((value) => (value / total) * 100);

    return { xMidpoints, counts: histogram.counts, cdf };
  }, [results]);

  if (!chartData) {
    return null;
  }

  const cumulativeUnit = getFluidCumulativeUnit(fluidType);

  return (
    <div className="h-[250px]">
      <PlotlyChart
        data={[
          {
            x: chartData.xMidpoints,
            y: chartData.counts,
            type: "bar",
            name: "Histogram",
            marker: { color: "hsl(210, 100%, 52%)", opacity: 0.65 },
          },
          {
            x: chartData.xMidpoints,
            y: chartData.cdf,
            type: "scatter",
            mode: "lines",
            name: "CDF",
            line: { color: "hsl(142, 71%, 45%)", width: 2 },
            yaxis: "y2",
          },
        ]}
        layout={{
          xaxis: {
            title: { text: `EUR (${cumulativeUnit})`, font: { size: 10 } },
          },
          yaxis: {
            title: { text: "Frequency", font: { size: 10 } },
          },
          yaxis2: {
            title: { text: "CDF (%)", font: { size: 10 } },
            overlaying: "y",
            side: "right",
            range: [0, 100],
          },
          showlegend: true,
          legend: { orientation: "h", y: 1.12 },
          bargap: 0.12,
          hovermode: "x unified",
        }}
      />
    </div>
  );
}
