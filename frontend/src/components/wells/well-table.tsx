"use client";

import { useState } from "react";
import Link from "next/link";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUpDown, Trash2, Pencil, Eye } from "lucide-react";
import type { Well } from "@/types/well";
import { formatDate } from "@/lib/utils";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  shut_in: "secondary",
  plugged: "destructive",
  drilling: "outline",
  completing: "outline",
};

const columns: ColumnDef<Well>[] = [
  {
    accessorKey: "well_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Well Name
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        href={`/wells/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.getValue("well_name")}
      </Link>
    ),
  },
  {
    accessorKey: "api_number",
    header: "API #",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.getValue("api_number") || "--"}
      </span>
    ),
  },
  {
    accessorKey: "basin",
    header: "Basin",
    cell: ({ row }) => row.getValue("basin") || "--",
  },
  {
    accessorKey: "well_type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("well_type") as string;
      return <span className="capitalize">{type.replace("_", "/")}</span>;
    },
  },
  {
    accessorKey: "well_status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("well_status") as string;
      return (
        <Badge variant={statusVariant[status] || "outline"}>
          {status.replace("_", " ")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "operator",
    header: "Operator",
    cell: ({ row }) => row.getValue("operator") || "--",
  },
  {
    accessorKey: "first_prod_date",
    header: "First Prod.",
    cell: ({ row }) => formatDate(row.getValue("first_prod_date")),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/wells/${row.original.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/wells/${row.original.id}`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

interface WellTableProps {
  data: Well[];
}

export function WellTable({ data }: WellTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No wells found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
