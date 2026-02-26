"use client";

import { useMemo } from "react";
import { PlotlyChart } from "@/components/charts/plotly-chart";
import type { WellTestAnalyzeResponse } from "@/types/well-test";

interface WellTestDiagnosticChartProps {
  result: WellTestAnalyzeResponse;
  mode: "log_log" | "semi_log";
}

export function WellTestDiagnosticChart({
  result,
  mode,
}: WellTestDiagnosticChartProps) {
  const { data, layout } = useMemo(() => {
    if (mode === "log_log") {
      return buildLogLogChart(result);
    }
    return buildSemiLogChart(result);
  }, [result, mode]);

  return (
    <PlotlyChart data={data} layout={layout} className="h-[400px] w-full" />
  );
}

/* ---------- Log-log diagnostic (dp + dp' vs time) ---------- */
function buildLogLogChart(result: WellTestAnalyzeResponse): {
  data: Plotly.Data[];
  layout: Partial<Plotly.Layout>;
} {
  const deriv = result.plot_data.derivative;
  const logLog = result.plot_data.log_log;

  const traces: Plotly.Data[] = [];

  // Prefer derivative plot_data if available
  if (deriv) {
    traces.push(
      {
        x: deriv.time,
        y: deriv.delta_p,
        name: "\u0394p",
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "hsl(25, 95%, 53%)", size: 5 },
        hovertemplate: "t: %{x:.3f} hr<br>\u0394p: %{y:.1f} psi<extra></extra>",
      },
      {
        x: deriv.time,
        y: deriv.derivative,
        name: "p\u2032 (Bourdet derivative)",
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "hsl(210, 100%, 52%)", size: 5, symbol: "triangle-up" },
        hovertemplate:
          "t: %{x:.3f} hr<br>p\u2032: %{y:.1f} psi<extra></extra>",
      },
    );

    // Flow regime shading lines
    if (deriv.flow_regimes) {
      const regimeColors: Record<string, string> = {
        wellbore_storage: "hsl(0, 72%, 51%)",
        iarf: "hsl(150, 60%, 45%)",
        boundary: "hsl(270, 60%, 55%)",
        linear: "hsl(45, 90%, 50%)",
      };

      for (const regime of deriv.flow_regimes) {
        const timeSlice = deriv.time.slice(regime.start_idx, regime.end_idx + 1);
        const derivSlice = deriv.derivative.slice(
          regime.start_idx,
          regime.end_idx + 1,
        );
        if (timeSlice.length > 0) {
          traces.push({
            x: timeSlice,
            y: derivSlice,
            name: regime.name,
            type: "scatter" as const,
            mode: "lines" as const,
            line: {
              color: regimeColors[regime.name] || "hsl(0, 0%, 50%)",
              width: 2,
              dash: "dash" as const,
            },
            hovertemplate: `${regime.name} (slope: ${regime.slope.toFixed(2)})<extra></extra>`,
          });
        }
      }
    }
  } else if (logLog) {
    // Fallback: simple log-log arrays
    traces.push(
      {
        x: logLog.log_t,
        y: logLog.log_dp,
        name: "log(\u0394p)",
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "hsl(25, 95%, 53%)", size: 5 },
      },
      {
        x: logLog.log_t,
        y: logLog.log_deriv,
        name: "log(p\u2032)",
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "hsl(210, 100%, 52%)", size: 5, symbol: "triangle-up" },
      },
    );
  }

  return {
    data: traces,
    layout: {
      title: { text: "Log-Log Diagnostic Plot", font: { size: 13 } },
      xaxis: {
        title: { text: "Time (hrs)", font: { size: 11 } },
        type: "log" as const,
      },
      yaxis: {
        title: { text: "\u0394p & p\u2032 (psi)", font: { size: 11 } },
        type: "log" as const,
      },
      legend: { orientation: "h" as const, y: -0.2 },
      margin: { t: 40, r: 20, b: 70, l: 60 },
    },
  };
}

/* ---------- Semi-log (drawdown) or Horner (buildup) ---------- */
function buildSemiLogChart(result: WellTestAnalyzeResponse): {
  data: Plotly.Data[];
  layout: Partial<Plotly.Layout>;
} {
  const traces: Plotly.Data[] = [];
  let title = "Semi-Log Plot";
  let xLabel = "log\u2081\u2080(t) (hrs)";
  let yLabel = "Pwf (psia)";

  const isBuildup = result.test_type === "buildup";

  if (isBuildup && result.plot_data.horner) {
    const h = result.plot_data.horner;
    title = "Horner Plot";
    xLabel = "log\u2081\u2080((tp+\u0394t)/\u0394t)";
    yLabel = "Pws (psia)";

    traces.push(
      {
        x: h.log_htr,
        y: h.pws,
        name: "Pws (measured)",
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "hsl(25, 95%, 53%)", size: 5 },
        hovertemplate:
          "HTR: %{x:.3f}<br>Pws: %{y:.1f} psia<extra></extra>",
      },
      {
        x: h.log_htr,
        y: h.fit_line,
        name: "IARF straight line",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "hsl(150, 60%, 45%)", width: 2, dash: "dash" as const },
        hovertemplate: "Fit: %{y:.1f} psia<extra></extra>",
      },
    );
  } else if (!isBuildup && result.plot_data.semi_log) {
    const sl = result.plot_data.semi_log;
    title = "Semi-Log Plot (Drawdown)";

    traces.push(
      {
        x: sl.log_t,
        y: sl.pwf,
        name: "Pwf (measured)",
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "hsl(25, 95%, 53%)", size: 5 },
        hovertemplate:
          "log(t): %{x:.3f}<br>Pwf: %{y:.1f} psia<extra></extra>",
      },
      {
        x: sl.log_t,
        y: sl.fit_line,
        name: "IARF straight line",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "hsl(150, 60%, 45%)", width: 2, dash: "dash" as const },
        hovertemplate: "Fit: %{y:.1f} psia<extra></extra>",
      },
    );
  } else if (isBuildup && result.plot_data.mdh) {
    // MDH fallback for buildup without Horner
    const m = result.plot_data.mdh;
    title = "MDH Plot (Buildup)";
    xLabel = "log\u2081\u2080(\u0394t) (hrs)";
    yLabel = "Pws (psia)";

    traces.push(
      {
        x: m.log_dt,
        y: m.pws,
        name: "Pws (measured)",
        type: "scatter" as const,
        mode: "markers" as const,
        marker: { color: "hsl(25, 95%, 53%)", size: 5 },
      },
      {
        x: m.log_dt,
        y: m.fit_line,
        name: "MDH straight line",
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: "hsl(150, 60%, 45%)", width: 2, dash: "dash" as const },
      },
    );
  }

  return {
    data: traces,
    layout: {
      title: { text: title, font: { size: 13 } },
      xaxis: { title: { text: xLabel, font: { size: 11 } } },
      yaxis: { title: { text: yLabel, font: { size: 11 } } },
      legend: { orientation: "h" as const, y: -0.2 },
      margin: { t: 40, r: 20, b: 70, l: 60 },
    },
  };
}
