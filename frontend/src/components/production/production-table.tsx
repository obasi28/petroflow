"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProductionRecord } from "@/types/production";
import { formatDate } from "@/lib/utils";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface ProductionTableProps {
  data: ProductionRecord[];
  onEdit?: (record: ProductionRecord) => void;
  onDeleteSelected?: (dates: string[]) => void;
}

export function ProductionTable({ data, onEdit, onDeleteSelected }: ProductionTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (date: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((r) => r.production_date)));
    }
  };

  const handleBulkDelete = () => {
    if (selected.size > 0 && onDeleteSelected) {
      onDeleteSelected(Array.from(selected));
      setSelected(new Set());
    }
  };

  return (
    <div className="space-y-2">
      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {selected.size} record(s) selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            onClick={handleBulkDelete}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={data.length > 0 && selected.size === data.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Oil Rate</TableHead>
              <TableHead className="text-right">Gas Rate</TableHead>
              <TableHead className="text-right">Water Rate</TableHead>
              <TableHead className="text-right">GOR</TableHead>
              <TableHead className="text-right">Water Cut</TableHead>
              <TableHead className="text-right">Cum Oil</TableHead>
              <TableHead className="text-right">Cum Gas</TableHead>
              <TableHead className="text-right">Days On</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center">
                  No production data available.
                </TableCell>
              </TableRow>
            ) : (
              data.map((record) => (
                <TableRow
                  key={record.production_date}
                  data-state={selected.has(record.production_date) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(record.production_date)}
                      onCheckedChange={() => toggleSelect(record.production_date)}
                    />
                  </TableCell>
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(record)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onDeleteSelected && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDeleteSelected([record.production_date])}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
