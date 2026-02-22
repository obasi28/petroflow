"use client";

import type { DCAAnalysis } from "@/types/dca";
import { MODEL_PARAMETERS, PARAMETER_UNITS } from "@/types/dca";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DCAParametersPanelProps {
  analysis: DCAAnalysis;
}

export function DCAParametersPanel({ analysis }: DCAParametersPanelProps) {
  const paramNames = MODEL_PARAMETERS[analysis.model_type] || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Fitted Parameters</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Parameter</TableHead>
              <TableHead className="text-right text-xs">Value</TableHead>
              <TableHead className="text-right text-xs">Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paramNames.map((param) => (
              <TableRow key={param}>
                <TableCell className="text-xs font-mono font-medium">
                  {param}
                </TableCell>
                <TableCell className="text-right text-xs font-mono">
                  {analysis.parameters[param] != null
                    ? analysis.parameters[param].toPrecision(5)
                    : "--"}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {PARAMETER_UNITS[param] || "--"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
