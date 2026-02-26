"use client";

import { useMemo } from "react";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import type { PVTCalculateResponse } from "@/types/pvt";

interface PVTChartProps {
  result: PVTCalculateResponse;
  mode?: "bo_rs" | "viscosity" | "z_factor";
}

export function PVTChart({ result, mode = "bo_rs" }: PVTChartProps) {
  const { data, layout } = useMemo(() => {
    const pressures = result.table.map((p) => p.pressure);
    const pb = result.bubble_point;

    if (mode === "bo_rs") {
      return buildBoRsChart(result, pressures, pb);
    } else if (mode === "viscosity") {
      return buildViscosityChart(result, pressures, pb);
    } else {
      return buildZFactorChart(result, pressures, pb);
    }
  }, [result, mode]);

  return (
    <PlotlyChart
      data={data}
      layout={layout}
      className="h-[380px] w-full"
    />
  );
}

function buildBoRsChart(
  result: PVTCalculateResponse,
  pressures: number[],
  pb: number,
): { data: Plotly.Data[]; layout: Partial<Plotly.Layout> } {
  const bo = result.table.map((p) => p.bo);
  const rs = result.table.map((p) => p.rs);

  return {
    data: [
      {
        x: pressures,
        y: bo,
        name: "Bo (rb/stb)",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "hsl(25, 95%, 53%)", width: 2.5 },
        yaxis: "y",
        hovertemplate: "P: %{x:.0f} psia<br>Bo: %{y:.4f} rb/stb<extra></extra>",
      },
      {
        x: pressures,
        y: rs,
        name: "Rs (scf/stb)",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "hsl(210, 100%, 52%)", width: 2.5 },
        yaxis: "y2",
        hovertemplate: "P: %{x:.0f} psia<br>Rs: %{y:.0f} scf/stb<extra></extra>",
      },
      // Bubble point marker
      {
        x: [pb, pb],
        y: [Math.min(...bo), Math.max(...bo)],
        name: `Pb = ${pb.toFixed(0)} psia`,
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "hsl(0, 72%, 51%)", width: 1.5, dash: "dash" as const },
        yaxis: "y",
        hoverinfo: "name" as const,
      },
    ],
    layout: {
      title: { text: "Oil Formation Volume Factor & Solution GOR", font: { size: 13 } },
      xaxis: { title: { text: "Pressure (psia)", font: { size: 11 } } },
      yaxis: {
        title: { text: "Bo (rb/stb)", font: { size: 11, color: "hsl(25, 95%, 53%)" } },
        side: "left" as const,
      },
      yaxis2: {
        title: { text: "Rs (scf/stb)", font: { size: 11, color: "hsl(210, 100%, 52%)" } },
        overlaying: "y" as const,
        side: "right" as const,
        gridcolor: "transparent",
      },
      legend: { orientation: "h" as const, y: -0.18 },
      margin: { t: 40, r: 60, b: 70, l: 60 },
    },
  };
}

function buildViscosityChart(
  result: PVTCalculateResponse,
  pressures: number[],
  pb: number,
): { data: Plotly.Data[]; layout: Partial<Plotly.Layout> } {
  const mu_o = result.table.map((p) => p.mu_o);
  const mu_g = result.table.map((p) => p.mu_g);

  return {
    data: [
      {
        x: pressures,
        y: mu_o,
        name: "Oil Viscosity (cp)",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "hsl(25, 95%, 53%)", width: 2.5 },
        hovertemplate: "P: %{x:.0f} psia<br>μo: %{y:.3f} cp<extra></extra>",
      },
      {
        x: pressures,
        y: mu_g,
        name: "Gas Viscosity (cp)",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "hsl(0, 72%, 51%)", width: 2 },
        yaxis: "y2",
        hovertemplate: "P: %{x:.0f} psia<br>μg: %{y:.5f} cp<extra></extra>",
      },
      // Bubble point
      {
        x: [pb, pb],
        y: [Math.min(...mu_o), Math.max(...mu_o)],
        name: `Pb = ${pb.toFixed(0)} psia`,
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "hsl(0, 72%, 51%)", width: 1.5, dash: "dash" as const },
        hoverinfo: "name" as const,
      },
    ],
    layout: {
      title: { text: "Viscosity vs Pressure", font: { size: 13 } },
      xaxis: { title: { text: "Pressure (psia)", font: { size: 11 } } },
      yaxis: {
        title: { text: "Oil Viscosity (cp)", font: { size: 11, color: "hsl(25, 95%, 53%)" } },
        side: "left" as const,
      },
      yaxis2: {
        title: { text: "Gas Viscosity (cp)", font: { size: 11, color: "hsl(0, 72%, 51%)" } },
        overlaying: "y" as const,
        side: "right" as const,
        gridcolor: "transparent",
      },
      legend: { orientation: "h" as const, y: -0.18 },
      margin: { t: 40, r: 60, b: 70, l: 60 },
    },
  };
}

function buildZFactorChart(
  result: PVTCalculateResponse,
  pressures: number[],
  pb: number,
): { data: Plotly.Data[]; layout: Partial<Plotly.Layout> } {
  const z = result.table.map((p) => p.z_factor);
  const bg = result.table.map((p) => p.bg);

  return {
    data: [
      {
        x: pressures,
        y: z,
        name: "Z-Factor",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "hsl(150, 60%, 45%)", width: 2.5 },
        hovertemplate: "P: %{x:.0f} psia<br>Z: %{y:.4f}<extra></extra>",
      },
      {
        x: pressures,
        y: bg,
        name: "Bg (rb/Mscf)",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "hsl(270, 60%, 55%)", width: 2 },
        yaxis: "y2",
        hovertemplate: "P: %{x:.0f} psia<br>Bg: %{y:.4f} rb/Mscf<extra></extra>",
      },
    ],
    layout: {
      title: { text: "Gas Z-Factor & Formation Volume Factor", font: { size: 13 } },
      xaxis: { title: { text: "Pressure (psia)", font: { size: 11 } } },
      yaxis: {
        title: { text: "Z-Factor", font: { size: 11, color: "hsl(150, 60%, 45%)" } },
        side: "left" as const,
      },
      yaxis2: {
        title: { text: "Bg (rb/Mscf)", font: { size: 11, color: "hsl(270, 60%, 55%)" } },
        overlaying: "y" as const,
        side: "right" as const,
        gridcolor: "transparent",
      },
      legend: { orientation: "h" as const, y: -0.18 },
      margin: { t: 40, r: 60, b: 70, l: 60 },
    },
  };
}
