"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductionRecord } from "@/types/production";
import { formatDate } from "@/lib/utils";

interface ProductionTableProps {
  data: ProductionRecord[];
}

export function ProductionTable({ data }: ProductionTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Oil Rate</TableHead>
            <TableHead className="text-right">Gas Rate</TableHead>
            <TableHead className="text-right">Water Rate</TableHead>
            <TableHead className="text-right">GOR</TableHead>
            <TableHead className="text-right">Water Cut</TableHead>
            <TableHead className="text-right">Cum Oil</TableHead>
            <TableHead className="text-right">Cum Gas</TableHead>
            <TableHead className="text-right">Days On</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No production data available.
              </TableCell>
            </TableRow>
          ) : (
            data.map((record) => (
              <TableRow key={record.production_date}>
                <TableCell className="font-mono text-xs">
                  {formatDate(record.production_date)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-[hsl(25,95%,53%)]">
                  {record.oil_rate?.toFixed(1) ?? "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-[hsl(0,72%,51%)]">
                  {record.gas_rate?.toFixed(1) ?? "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-[hsl(210,100%,52%)]">
                  {record.water_rate?.toFixed(1) ?? "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {record.gor?.toFixed(0) ?? "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {record.water_cut != null ? `${(record.water_cut * 100).toFixed(1)}%` : "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {record.cum_oil?.toFixed(0) ?? "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {record.cum_gas?.toFixed(0) ?? "--"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {record.days_on}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
