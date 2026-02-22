"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MODEL_LABELS, type DCAModelType } from "@/types/dca";
import { formatCumulative } from "@/lib/utils";

interface ModelResult {
  model_type: DCAModelType;
  parameters: Record<string, number>;
  r_squared: number;
  rmse: number;
  aic: number;
  bic: number;
  eur: number | null;
}

interface ModelComparisonTableProps {
  results: ModelResult[];
}

export function ModelComparisonTable({ results }: ModelComparisonTableProps) {
  // Sort by AIC (lower is better)
  const sorted = [...results].sort((a, b) => a.aic - b.aic);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Model Comparison (Ranked by AIC)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Rank</TableHead>
                <TableHead className="text-xs">Model</TableHead>
                <TableHead className="text-right text-xs">R\u00b2</TableHead>
                <TableHead className="text-right text-xs">RMSE</TableHead>
                <TableHead className="text-right text-xs">AIC</TableHead>
                <TableHead className="text-right text-xs">EUR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((result, index) => (
                <TableRow key={result.model_type}>
                  <TableCell className="text-xs">
                    {index === 0 ? (
                      <Badge variant="default" className="text-[10px]">
                        Best
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">#{index + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {MODEL_LABELS[result.model_type]}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {result.r_squared.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {result.rmse.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono">
                    {result.aic.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-mono text-primary">
                    {formatCumulative(result.eur)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
