"use client";

import { useState } from "react";
import Link from "next/link";
import { useWells } from "@/hooks/use-wells";
import { WellTable } from "@/components/wells/well-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search } from "lucide-react";
import type { WellFilters } from "@/types/well";

export default function WellsPage() {
  const [filters, setFilters] = useState<WellFilters>({
    page: 1,
    per_page: 50,
  });
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useWells(filters);
  const wells = data?.data || [];

  function handleSearch() {
    setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Wells</h1>
          <p className="text-muted-foreground">
            Manage your well inventory and analysis
          </p>
        </div>
        <Button asChild>
          <Link href="/wells/new">
            <Plus className="mr-2 h-4 w-4" />
            New Well
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search wells..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.well_status || "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              well_status: value === "all" ? undefined : (value as WellFilters["well_status"]),
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="shut_in">Shut In</SelectItem>
            <SelectItem value="plugged">Plugged</SelectItem>
            <SelectItem value="drilling">Drilling</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.well_type || "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              well_type: value === "all" ? undefined : (value as WellFilters["well_type"]),
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="oil">Oil</SelectItem>
            <SelectItem value="gas">Gas</SelectItem>
            <SelectItem value="oil_gas">Oil &amp; Gas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <WellTable data={wells} />
      )}

      {data?.meta && data.meta.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {wells.length} of {data.meta.total} wells
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === data.meta.total_pages}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
