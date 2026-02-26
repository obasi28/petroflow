"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Well } from "@/types/well";

interface WellReservoirParamsProps {
  well: Well;
}

const RESERVOIR_PARAMS = [
  {
    key: "initial_pressure" as const,
    label: "Initial Pressure",
    unit: "psi",
    color: "border-l-blue-500",
    icon: "↕",
  },
  {
    key: "reservoir_temp" as const,
    label: "Reservoir Temp",
    unit: "°F",
    color: "border-l-orange-500",
    icon: "🌡",
  },
  {
    key: "porosity" as const,
    label: "Porosity",
    unit: "%",
    color: "border-l-emerald-500",
    format: (v: number) => `${(v * 100).toFixed(1)}`,
  },
  {
    key: "permeability" as const,
    label: "Permeability",
    unit: "mD",
    color: "border-l-emerald-500",
  },
  {
    key: "water_saturation" as const,
    label: "Water Sat.",
    unit: "%",
    color: "border-l-cyan-500",
    format: (v: number) => `${(v * 100).toFixed(1)}`,
  },
  {
    key: "net_pay" as const,
    label: "Net Pay",
    unit: "ft",
    color: "border-l-emerald-500",
  },
] as const;

const COMPLETION_PARAMS = [
  { key: "total_depth" as const, label: "Total Depth", unit: "ft" },
  { key: "lateral_length" as const, label: "Lateral Length", unit: "ft" },
  { key: "num_stages" as const, label: "Frac Stages", unit: "" },
] as const;

function formatValue(value: number | null, format?: (v: number) => string): string {
  if (value == null) return "--";
  if (format) return format(value);
  if (value >= 10_000) return `${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function WellReservoirParams({ well }: WellReservoirParamsProps) {
  const hasReservoirData = RESERVOIR_PARAMS.some((p) => well[p.key] != null);
  const hasCompletionData = COMPLETION_PARAMS.some((p) => well[p.key] != null);

  return (
    <div className="space-y-4">
      {/* Reservoir Parameters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Reservoir Parameters</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {hasReservoirData ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {RESERVOIR_PARAMS.map((param) => (
                <div
                  key={param.key}
                  className={`rounded-md border-l-2 ${param.color} bg-muted/50 p-2`}
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {param.label}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold">
                    {formatValue(well[param.key], "format" in param ? param.format : undefined)}
                    {well[param.key] != null && (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        {param.unit}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No reservoir parameters available. Import from well CSV or edit well details.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Completion Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Completion Info</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {hasCompletionData ? (
            <div className="grid grid-cols-3 gap-2">
              {COMPLETION_PARAMS.map((param) => (
                <div key={param.key} className="rounded-md bg-muted/50 p-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {param.label}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold">
                    {formatValue(well[param.key])}
                    {well[param.key] != null && param.unit && (
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        {param.unit}
                      </span>
                    )}
                  </p>
                </div>
              ))}
              {/* Perf interval if available */}
              {(well.perf_top != null || well.perf_bottom != null) && (
                <div className="rounded-md bg-muted/50 p-2 col-span-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Perf Interval
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold">
                    {well.perf_top?.toLocaleString() ?? "--"} – {well.perf_bottom?.toLocaleString() ?? "--"}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">ft</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No completion data available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
