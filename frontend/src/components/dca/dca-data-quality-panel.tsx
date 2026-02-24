"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FLUID_LABELS, getFluidRateUnit, getFluidRateValue, type FluidType } from "@/types/dca";
import type { ProductionRecord } from "@/types/production";

interface DCADataQualityPanelProps {
  productionData: ProductionRecord[];
  fluidType: FluidType;
  currentStartDate: string;
  onApplySuggestedStartDate: (startDate: string) => void;
}

interface DCADataQualitySummary {
  totalRows: number;
  validRows: number;
  zeroOrNullRows: number;
  negativeRows: number;
  outlierRows: number;
  suggestedStartDate: string | null;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function detectSuggestedStartDate(records: ProductionRecord[], fluidType: FluidType): string | null {
  const rates = records.map((record) => ({
    date: record.production_date,
    rate: getFluidRateValue(fluidType, record),
  }));

  for (let index = 0; index <= rates.length - 3; index += 1) {
    if (rates[index].rate > 0 && rates[index + 1].rate > 0 && rates[index + 2].rate > 0) {
      return rates[index].date;
    }
  }

  const firstPositive = rates.find((point) => point.rate > 0);
  return firstPositive?.date ?? null;
}

function computeDataQualitySummary(records: ProductionRecord[], fluidType: FluidType): DCADataQualitySummary {
  const rates = records.map((record) => getFluidRateValue(fluidType, record));
  const positiveRates = rates.filter((value) => value > 0);
  const q1 = percentile(positiveRates, 0.25);
  const q3 = percentile(positiveRates, 0.75);
  const iqr = q3 - q1;
  const highOutlierThreshold = q3 + 1.5 * iqr;
  const lowOutlierThreshold = Math.max(0, q1 - 1.5 * iqr);

  const zeroOrNullRows = rates.filter((value) => value <= 0).length;
  const negativeRows = rates.filter((value) => value < 0).length;
  const outlierRows =
    positiveRates.length < 4
      ? 0
      : rates.filter((value) => value > highOutlierThreshold || value < lowOutlierThreshold).length;

  return {
    totalRows: records.length,
    validRows: rates.filter((value) => value > 0).length,
    zeroOrNullRows,
    negativeRows,
    outlierRows,
    suggestedStartDate: detectSuggestedStartDate(records, fluidType),
  };
}

export function DCADataQualityPanel({
  productionData,
  fluidType,
  currentStartDate,
  onApplySuggestedStartDate,
}: DCADataQualityPanelProps) {
  const summary = useMemo(
    () => computeDataQualitySummary(productionData, fluidType),
    [productionData, fluidType],
  );

  const rateUnit = getFluidRateUnit(fluidType);
  const hasSuggestedDate = Boolean(summary.suggestedStartDate);
  const canApplySuggestedDate =
    hasSuggestedDate && summary.suggestedStartDate !== currentStartDate;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Data Quality ({FLUID_LABELS[fluidType]} {rateUnit})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <Metric label="Rows" value={summary.totalRows.toString()} />
        <Metric label="Positive Rates" value={summary.validRows.toString()} />
        <Metric label="Zero/Null Rates" value={summary.zeroOrNullRows.toString()} warn={summary.zeroOrNullRows > 0} />
        <Metric label="Negative Rates" value={summary.negativeRows.toString()} warn={summary.negativeRows > 0} />
        <Metric label="Potential Outliers (IQR)" value={summary.outlierRows.toString()} warn={summary.outlierRows > 0} />

        <div className="rounded border border-border/60 px-2 py-1.5">
          <p className="text-muted-foreground">Suggested Start Date</p>
          <p className="font-mono font-medium">{summary.suggestedStartDate || "--"}</p>
        </div>

        {canApplySuggestedDate && summary.suggestedStartDate && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 w-full text-xs"
            onClick={() => onApplySuggestedStartDate(summary.suggestedStartDate!)}
          >
            Use Suggested Start Date
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${warn ? "text-amber-400" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
