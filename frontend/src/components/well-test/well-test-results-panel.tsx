"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { WellTestAnalyzeResponse } from "@/types/well-test";

interface WellTestResultsPanelProps {
  result: WellTestAnalyzeResponse;
}

function permBadgeColor(cls: string): string {
  const lower = cls.toLowerCase();
  if (lower.includes("excellent") || lower.includes("very good"))
    return "bg-emerald-600/20 text-emerald-400";
  if (lower.includes("good")) return "bg-green-600/20 text-green-400";
  if (lower.includes("moderate") || lower.includes("fair"))
    return "bg-yellow-600/20 text-yellow-400";
  if (lower.includes("poor")) return "bg-orange-600/20 text-orange-400";
  if (lower.includes("very poor") || lower.includes("tight"))
    return "bg-red-600/20 text-red-400";
  return "bg-muted text-muted-foreground";
}

function skinBadgeColor(desc: string): string {
  const lower = desc.toLowerCase();
  if (lower.includes("stimulated") || lower.includes("negative"))
    return "bg-emerald-600/20 text-emerald-400";
  if (lower.includes("no damage") || lower.includes("negligible"))
    return "bg-green-600/20 text-green-400";
  if (lower.includes("low")) return "bg-yellow-600/20 text-yellow-400";
  if (lower.includes("moderate")) return "bg-orange-600/20 text-orange-400";
  if (lower.includes("high") || lower.includes("severe"))
    return "bg-red-600/20 text-red-400";
  return "bg-muted text-muted-foreground";
}

export function WellTestResultsPanel({ result }: WellTestResultsPanelProps) {
  const s = result.summary;
  const isBuildup = result.test_type === "buildup";

  return (
    <div className="space-y-3">
      {/* Permeability */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Permeability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <MetricRow
            label="k"
            value={`${s.permeability_md.toFixed(2)} md`}
            highlight
          />
          <Badge
            variant="outline"
            className={`text-[10px] ${permBadgeColor(s.perm_class)}`}
          >
            {s.perm_class}
          </Badge>
        </CardContent>
      </Card>

      {/* Skin Factor */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Skin Factor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <MetricRow
            label="S"
            value={s.skin_factor.toFixed(2)}
            highlight
          />
          <Badge
            variant="outline"
            className={`text-[10px] ${skinBadgeColor(s.skin_description)}`}
          >
            {s.skin_description}
          </Badge>
          {s.dp_skin_psi != null && (
            <MetricRow
              label="\u0394p skin"
              value={`${s.dp_skin_psi.toFixed(1)} psi`}
            />
          )}
        </CardContent>
      </Card>

      {/* Flow Capacity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Flow Capacity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <MetricRow
            label="kh"
            value={`${s.flow_capacity_mdft.toFixed(1)} md\u00B7ft`}
            highlight
          />
          <MetricRow
            label="Slope (m)"
            value={`${s.slope_psi_cycle.toFixed(1)} psi/cycle`}
          />
        </CardContent>
      </Card>

      {/* Buildup-only: P* and FE */}
      {isBuildup && s.p_star_psi != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Extrapolated Pressure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <MetricRow
              label="P*"
              value={`${s.p_star_psi.toFixed(1)} psia`}
              highlight
            />
          </CardContent>
        </Card>
      )}

      {isBuildup && s.flow_efficiency != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Flow Efficiency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <MetricRow
              label="FE"
              value={s.flow_efficiency.toFixed(3)}
            />
            {s.fe_percent != null && (
              <MetricRow
                label="FE %"
                value={`${s.fe_percent.toFixed(1)}%`}
                highlight
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Drawdown-only: Radius of Investigation */}
      {!isBuildup && s.radius_investigation_ft != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Radius of Investigation</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricRow
              label="ri"
              value={`${s.radius_investigation_ft.toFixed(0)} ft`}
              highlight
            />
          </CardContent>
        </Card>
      )}

      {/* Flow Regimes + IARF */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">IARF Detected</span>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                s.iarf_detected
                  ? "bg-emerald-600/20 text-emerald-400"
                  : "bg-red-600/20 text-red-400"
              }`}
            >
              {s.iarf_detected ? "Yes" : "No"}
            </Badge>
          </div>
          {s.flow_regimes.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Flow Regimes
                </span>
                <div className="flex flex-wrap gap-1">
                  {s.flow_regimes.map((regime) => (
                    <Badge
                      key={regime}
                      variant="secondary"
                      className="text-[10px]"
                    >
                      {regime.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
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
