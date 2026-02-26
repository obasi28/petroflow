"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { MaterialBalanceCalculateResponse } from "@/types/material-balance";

interface DriveMechanismPanelProps {
  result: MaterialBalanceCalculateResponse;
}

function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null) return "--";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const DRIVE_INDEX_COLORS: Record<string, string> = {
  solution_gas: "hsl(25, 95%, 53%)",
  gas_cap: "hsl(0, 72%, 51%)",
  water_drive: "hsl(210, 100%, 52%)",
  compaction: "hsl(150, 60%, 45%)",
};

const DRIVE_INDEX_LABELS: Record<string, string> = {
  solution_gas: "Solution Gas Drive",
  gas_cap: "Gas Cap Expansion",
  water_drive: "Water Drive",
  compaction: "Rock/Fluid Compaction",
};

export function DriveMechanismPanel({ result }: DriveMechanismPanelProps) {
  return (
    <div className="space-y-3">
      {/* OOIP Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Original Oil in Place</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <span className="text-2xl font-bold font-mono text-primary">
              {formatNumber(result.ooip)}
            </span>
            <span className="ml-1.5 text-xs text-muted-foreground">STB</span>
          </div>
        </CardContent>
      </Card>

      {/* OGIP Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Original Gas in Place</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <span className="text-2xl font-bold font-mono text-primary">
              {formatNumber(result.ogip)}
            </span>
            <span className="ml-1.5 text-xs text-muted-foreground">scf</span>
          </div>
        </CardContent>
      </Card>

      {/* Gas Cap Ratio */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Gas Cap Ratio (m)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <span className="text-lg font-bold font-mono">
              {result.gas_cap_ratio != null
                ? result.gas_cap_ratio.toFixed(3)
                : "--"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Drive Mechanism */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Drive Mechanism</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {result.drive_mechanism || "Unknown"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Drive Indices */}
      {result.drive_indices &&
        Object.keys(result.drive_indices).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Drive Indices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(result.drive_indices).map(([key, value]) => {
                const pct = Math.max(0, Math.min(100, value * 100));
                const color =
                  DRIVE_INDEX_COLORS[key] || "hsl(240, 5%, 64.9%)";
                const label = DRIVE_INDEX_LABELS[key] || key;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono font-medium">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono font-medium">
                  {(
                    Object.values(result.drive_indices).reduce(
                      (a, b) => a + b,
                      0,
                    ) * 100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Method Used */}
      <Card>
        <CardContent className="py-3">
          <MetricRow label="Method" value={result.method} />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono font-medium ${highlight ? "text-primary" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
