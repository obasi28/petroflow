"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PVTCalculateResponse } from "@/types/pvt";

interface PVTResultsCardsProps {
  result: PVTCalculateResponse;
}

export function PVTResultsCards({ result }: PVTResultsCardsProps) {
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Key Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <MetricRow
            label="Bubble Point (Pb)"
            value={`${result.bubble_point.toFixed(0)} psia`}
            highlight
          />
          <Separator />
          <MetricRow
            label="Rs @ Pb"
            value={`${result.rs_at_pb.toFixed(0)} scf/stb`}
          />
          <MetricRow
            label="Bo @ Pb"
            value={`${result.bo_at_pb.toFixed(4)} rb/stb`}
          />
          <MetricRow
            label="μo @ Pb"
            value={`${result.mu_o_at_pb.toFixed(3)} cp`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Surface Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {result.table.length > 0 && (
            <>
              <MetricRow
                label="μo (dead)"
                value={`${result.table[0].mu_o.toFixed(3)} cp`}
              />
              <MetricRow
                label="Oil Density"
                value={`${result.table[0].oil_density.toFixed(1)} lb/ft³`}
              />
            </>
          )}
        </CardContent>
      </Card>

      {result.table.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">At Max Pressure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(() => {
              const last = result.table[result.table.length - 1];
              return (
                <>
                  <MetricRow
                    label="Pressure"
                    value={`${last.pressure.toFixed(0)} psia`}
                  />
                  <MetricRow
                    label="Z-Factor"
                    value={last.z_factor.toFixed(4)}
                  />
                  <MetricRow
                    label="Gas Bg"
                    value={`${last.bg.toFixed(4)} rb/Mscf`}
                  />
                  <MetricRow
                    label="μg"
                    value={`${last.mu_g.toFixed(5)} cp`}
                  />
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
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
      <span className={`font-mono font-medium ${highlight ? "text-primary" : ""}`}>
        {value}
      </span>
    </div>
  );
}
