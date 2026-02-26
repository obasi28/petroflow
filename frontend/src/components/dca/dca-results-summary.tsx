"use client";

import type { DCAAnalysis } from "@/types/dca";
import { MODEL_LABELS, getFluidCumulativeUnit, getFluidRateUnit } from "@/types/dca";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCumulative } from "@/lib/utils";
import { MonteCarloResultsChart } from "@/components/dca/monte-carlo-results-chart";
import { ExportButton } from "@/components/shared/export-button";

interface DCAResultsSummaryProps {
  analysis: DCAAnalysis;
}

export function DCAResultsSummary({ analysis }: DCAResultsSummaryProps) {
  const rateUnit = getFluidRateUnit(analysis.fluid_type);
  const cumulativeUnit = getFluidCumulativeUnit(analysis.fluid_type);
  const mcP50 = analysis.monte_carlo_results?.p50 ?? null;
  const deterministicEur = analysis.eur ?? null;
  const mcWarning =
    mcP50 != null && deterministicEur != null && deterministicEur > 0 && mcP50 > deterministicEur * 10;

  return (
    <div className="space-y-3">
      {/* Fit Quality */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Fit Quality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <MetricRow label="Model" value={MODEL_LABELS[analysis.model_type]} />
          <MetricRow
            label="R2"
            value={analysis.r_squared?.toFixed(6) || "--"}
            highlight={analysis.r_squared != null && analysis.r_squared > 0.95}
          />
          <MetricRow label="RMSE" value={analysis.rmse?.toFixed(2) || "--"} />
          <MetricRow label="AIC" value={analysis.aic?.toFixed(1) || "--"} />
          <MetricRow label="BIC" value={analysis.bic?.toFixed(1) || "--"} />
        </CardContent>
      </Card>

      {/* Reserves */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reserves Estimate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <MetricRow
            label="EUR"
            value={formatCumulative(analysis.eur, cumulativeUnit)}
            highlight
          />
          <MetricRow
            label="Remaining"
            value={formatCumulative(analysis.remaining_reserves, cumulativeUnit)}
          />
          <MetricRow
            label="Cum at Start"
            value={formatCumulative(analysis.cum_at_forecast_start, cumulativeUnit)}
          />
          <Separator />
          <MetricRow
            label="Forecast"
            value={`${analysis.forecast_months} months`}
          />
          <MetricRow
            label="Econ. Limit"
            value={analysis.economic_limit ? `${analysis.economic_limit} ${rateUnit}` : "--"}
          />
          <Separator />
          <ExportButton
            path={`/wells/${analysis.well_id}/dca/${analysis.id}/export`}
            filename={`dca_${analysis.model_type}_forecast.csv`}
            label="Export Forecast"
            variant="outline"
            size="sm"
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Monte Carlo Results */}
      {analysis.monte_carlo_results && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monte Carlo EUR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <MetricRow
              label="P90 (Conservative)"
              value={formatCumulative(analysis.monte_carlo_results.p90, cumulativeUnit)}
            />
            <MetricRow
              label="P50 (Most Likely)"
              value={formatCumulative(analysis.monte_carlo_results.p50, cumulativeUnit)}
              highlight
            />
            <MetricRow
              label="P10 (Optimistic)"
              value={formatCumulative(analysis.monte_carlo_results.p10, cumulativeUnit)}
            />
            <Separator />
            <MetricRow
              label="Mean"
              value={formatCumulative(analysis.monte_carlo_results.mean, cumulativeUnit)}
            />
            <MetricRow
              label="Iterations"
              value={analysis.monte_carlo_results.iterations?.toString() || "--"}
            />
            {mcWarning && (
              <p className="rounded border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
                Monte Carlo P50 is much larger than deterministic EUR. Review parameter distributions and start date.
              </p>
            )}
            <Separator />
            <MonteCarloResultsChart
              fluidType={analysis.fluid_type}
              results={analysis.monte_carlo_results}
            />
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
