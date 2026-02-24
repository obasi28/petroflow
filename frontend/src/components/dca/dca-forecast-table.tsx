"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { getFluidCumulativeUnit, getFluidRateUnit, type DCAForecastPoint, type FluidType } from "@/types/dca";
import { formatDate } from "@/lib/utils";

interface DCAForecastTableProps {
  forecastPoints: DCAForecastPoint[];
  modelType: string;
  fluidType: FluidType;
}

export function DCAForecastTable({ forecastPoints, modelType, fluidType }: DCAForecastTableProps) {
  const rateUnit = getFluidRateUnit(fluidType);
  const cumulativeUnit = getFluidCumulativeUnit(fluidType);

  function exportToCSV() {
    const headers = `Date,Month,Rate (${rateUnit}),Cumulative (${cumulativeUnit})\n`;
    const rows = forecastPoints
      .map((p) => `${p.forecast_date},${p.time_months},${p.rate.toFixed(2)},${p.cumulative.toFixed(0)}`)
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${modelType}_forecast.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Forecast Data</CardTitle>
        <Button variant="outline" size="sm" onClick={exportToCSV}>
          <Download className="mr-2 h-3.5 w-3.5" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="max-h-[300px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-right text-xs">Month</TableHead>
                  <TableHead className="text-right text-xs">Rate ({rateUnit})</TableHead>
                  <TableHead className="text-right text-xs">Cumulative ({cumulativeUnit})</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {forecastPoints.slice(0, 60).map((point) => (
                <TableRow key={point.forecast_date}>
                  <TableCell className="text-xs font-mono">
                    {formatDate(point.forecast_date)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {point.time_months}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono text-[hsl(25,95%,53%)]">
                    {point.rate.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {point.cumulative.toFixed(0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {forecastPoints.length > 60 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing 60 of {forecastPoints.length} forecast points. Export CSV for full data.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
