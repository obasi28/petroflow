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
import type { PVTCalculateResponse } from "@/types/pvt";

interface PVTPropertiesTableProps {
  result: PVTCalculateResponse;
}

export function PVTPropertiesTable({ result }: PVTPropertiesTableProps) {
  const isBubblePoint = (pressure: number) =>
    Math.abs(pressure - result.bubble_point) < 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">PVT Properties Table</CardTitle>
        <span className="text-xs text-muted-foreground">
          {result.table.length} points
        </span>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">P (psia)</TableHead>
                <TableHead className="text-right text-xs">Rs (scf/stb)</TableHead>
                <TableHead className="text-right text-xs">Bo (rb/stb)</TableHead>
                <TableHead className="text-right text-xs">Bg (rb/Mscf)</TableHead>
                <TableHead className="text-right text-xs">μo (cp)</TableHead>
                <TableHead className="text-right text-xs">μg (cp)</TableHead>
                <TableHead className="text-right text-xs">Z</TableHead>
                <TableHead className="text-right text-xs">ρo (lb/ft³)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.table.map((pt, idx) => (
                <TableRow
                  key={idx}
                  className={isBubblePoint(pt.pressure) ? "bg-primary/10 font-semibold" : ""}
                >
                  <TableCell className="font-mono text-xs">
                    {pt.pressure.toFixed(0)}
                    {isBubblePoint(pt.pressure) && (
                      <span className="ml-1 text-[10px] text-primary">Pb</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-[hsl(210,100%,52%)]">
                    {pt.rs.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-[hsl(25,95%,53%)]">
                    {pt.bo.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {pt.bg.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {pt.mu_o.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {pt.mu_g.toFixed(5)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-[hsl(150,60%,45%)]">
                    {pt.z_factor.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {pt.oil_density.toFixed(1)}
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
