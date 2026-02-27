"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useWells } from "@/hooks/use-wells";
import { useProduction, useProductionStats } from "@/hooks/use-production";
import { useDCAAnalyses } from "@/hooks/use-dca";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, TrendingUp, Layers } from "lucide-react";
import { formatCumulative, formatRate, formatDate } from "@/lib/utils";
import type { Well } from "@/types/well";

function WellComparisonTable({ wells }: { wells: Well[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Well Name</TableHead>
            <TableHead className="text-xs">Basin</TableHead>
            <TableHead className="text-xs">Formation</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Orientation</TableHead>
            <TableHead className="text-right text-xs">Depth (ft)</TableHead>
            <TableHead className="text-right text-xs">Lateral (ft)</TableHead>
            <TableHead className="text-right text-xs">Stages</TableHead>
            <TableHead className="text-right text-xs">Pi (psi)</TableHead>
            <TableHead className="text-right text-xs">Porosity</TableHead>
            <TableHead className="text-right text-xs">Perm (mD)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {wells.map((w) => (
            <TableRow key={w.id}>
              <TableCell className="text-xs font-medium">
                <Link href={`/wells/${w.id}`} className="text-primary hover:underline">
                  {w.well_name}
                </Link>
              </TableCell>
              <TableCell className="text-xs">{w.basin || "--"}</TableCell>
              <TableCell className="text-xs">{w.formation || "--"}</TableCell>
              <TableCell className="text-xs capitalize">{w.well_type.replace("_", "/")}</TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-[10px]">{w.well_status.replace("_", " ")}</Badge>
              </TableCell>
              <TableCell className="text-xs capitalize">{w.orientation}</TableCell>
              <TableCell className="text-right text-xs font-mono">{w.total_depth?.toLocaleString() || "--"}</TableCell>
              <TableCell className="text-right text-xs font-mono">{w.lateral_length?.toLocaleString() || "--"}</TableCell>
              <TableCell className="text-right text-xs font-mono">{w.num_stages || "--"}</TableCell>
              <TableCell className="text-right text-xs font-mono">{w.initial_pressure?.toLocaleString() || "--"}</TableCell>
              <TableCell className="text-right text-xs font-mono">{w.porosity != null ? (w.porosity * 100).toFixed(1) + "%" : "--"}</TableCell>
              <TableCell className="text-right text-xs font-mono">{w.permeability?.toFixed(2) || "--"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function WellProductionComparison({ wellIds }: { wellIds: string[] }) {
  // Show per-well stats side by side
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {wellIds.map((id) => (
        <WellStatCard key={id} wellId={id} />
      ))}
    </div>
  );
}

function WellStatCard({ wellId }: { wellId: string }) {
  const { data: wellData } = useWells({ search: "", per_page: 200 });
  const { data: statsData, isLoading } = useProductionStats(wellId);
  const { data: dcaData } = useDCAAnalyses(wellId);

  const wells = wellData?.data || [];
  const well = wells.find((w) => w.id === wellId);
  const stats = statsData?.data;
  const dcaAnalyses = dcaData?.data || [];
  const latestDCA =
    dcaAnalyses.find((a) => a.is_primary) ||
    (dcaAnalyses.length > 0 ? dcaAnalyses[dcaAnalyses.length - 1] : null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          <Link href={`/wells/${wellId}`} className="text-primary hover:underline">
            {well?.well_name || "Loading..."}
          </Link>
        </CardTitle>
        {well && (
          <p className="text-[10px] text-muted-foreground">
            {well.basin || "No basin"} &middot; {well.formation || "No formation"}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : stats ? (
          <div className="grid grid-cols-2 gap-2">
            <MiniMetric label="Cum Oil" value={formatCumulative(stats.cum_oil)} />
            <MiniMetric label="Cum Gas" value={formatCumulative(stats.cum_gas, "Mcf")} />
            <MiniMetric label="Peak Oil" value={formatRate(stats.peak_oil_rate)} />
            <MiniMetric label="Records" value={`${stats.total_records} mo`} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No production data</p>
        )}
        {latestDCA && (
          <div className="rounded bg-muted/50 p-2">
            <p className="text-[10px] text-muted-foreground">Latest DCA</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs capitalize">{latestDCA.model_type.replace("_", " ")}</span>
              <span className="font-mono text-xs font-semibold text-primary">
                EUR: {formatCumulative(latestDCA.eur)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                R²: {latestDCA.r_squared?.toFixed(4) || "--"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-mono text-xs font-semibold">{value}</p>
    </div>
  );
}

export default function MultiWellAnalysisPage() {
  const { data: wellsData, isLoading } = useWells({ per_page: 200 });
  const wells = wellsData?.data || [];

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterBasin, setFilterBasin] = useState<string>("all");

  const basins = useMemo(() => {
    const set = new Set<string>();
    wells.forEach((w) => {
      if (w.basin) set.add(w.basin);
    });
    return Array.from(set).sort();
  }, [wells]);

  const filteredWells = useMemo(() => {
    if (filterBasin === "all") return wells;
    return wells.filter((w) => w.basin === filterBasin);
  }, [wells, filterBasin]);

  const selectedWells = useMemo(
    () => wells.filter((w) => selectedIds.has(w.id)),
    [wells, selectedIds],
  );

  function toggleWell(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filteredWells.map((w) => w.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Multi-Well Analysis</h1>
        <p className="text-muted-foreground">
          Compare wells side by side, analyze production, and review DCA results
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Well Selection Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Select Wells</CardTitle>
            <div className="flex items-center gap-2 pt-1">
              <Select value={filterBasin} onValueChange={setFilterBasin}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Filter by basin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Basins</SelectItem>
                  {basins.map((b) => (
                    <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-0.5 p-3 pt-0">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))
                ) : filteredWells.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No wells found</p>
                ) : (
                  filteredWells.map((well) => (
                    <label
                      key={well.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedIds.has(well.id)}
                        onCheckedChange={() => toggleWell(well.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{well.well_name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {well.basin || "No basin"} &middot;{" "}
                          <span className="capitalize">{well.well_status.replace("_", " ")}</span>
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Analysis Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {selectedIds.size} well{selectedIds.size !== 1 ? "s" : ""} selected
            </Badge>
          </div>

          {selectedIds.size === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Layers className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Select wells from the panel to begin comparison
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="comparison">
              <TabsList>
                <TabsTrigger value="comparison">
                  <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                  Well Comparison
                </TabsTrigger>
                <TabsTrigger value="production">
                  <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                  Production & DCA
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comparison">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Well Parameters Comparison ({selectedWells.length} wells)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WellComparisonTable wells={selectedWells} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="production">
                <WellProductionComparison wellIds={Array.from(selectedIds)} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
