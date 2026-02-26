"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useProject,
  useProjectDCA,
  useProjectMB,
  useProjectWT,
  useProjectSummary,
  useBatchDCA,
} from "@/hooks/use-projects";
import { useWells } from "@/hooks/use-wells";
import { WellTable } from "@/components/wells/well-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Upload, Play, Loader2 } from "lucide-react";
import { formatCumulative, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { data: projectData, isLoading: projectLoading } = useProject(projectId);
  const { data: projectSummaryData, isLoading: summaryLoading } = useProjectSummary(projectId);
  const { data: projectDCAData, isLoading: dcaLoading } = useProjectDCA(projectId);
  const { data: projectMBData, isLoading: mbLoading } = useProjectMB(projectId);
  const { data: projectWTData, isLoading: wtLoading } = useProjectWT(projectId);
  const { data: wellsData, isLoading: wellsLoading } = useWells({
    project_id: projectId,
    per_page: 100,
  });

  const batchDCA = useBatchDCA(projectId);

  const [batchModelType, setBatchModelType] = useState("exponential");
  const [batchFluidType, setBatchFluidType] = useState("oil");

  const project = projectData?.data;
  const wells = wellsData?.data || [];
  const summary = projectSummaryData?.data;
  const dcaAnalyses = projectDCAData?.data || [];
  const mbAnalyses = projectMBData?.data || [];
  const wtAnalyses = projectWTData?.data || [];

  const handleBatchDCA = useCallback(() => {
    batchDCA.mutate(
      {
        model_type: batchModelType,
        fluid_type: batchFluidType,
        forecast_months: 240,
        economic_limit: 10.0,
      },
      {
        onSuccess: (response) => {
          const result = response.data;
          if (result) {
            toast.success(
              `Batch DCA complete: ${result.succeeded}/${result.total_wells} wells analyzed` +
                (result.failed > 0 ? ` (${result.failed} failed)` : ""),
            );
          }
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Batch DCA failed"),
      },
    );
  }, [batchDCA, batchModelType, batchFluidType]);

  if (projectLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${projectId}/import-wells`}>
              <Upload className="mr-2 h-4 w-4" />
              Import Wells
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/wells/new?project_id=${projectId}`}>
              <Plus className="mr-2 h-4 w-4" />
              New Well
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Wells</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {summaryLoading ? <Skeleton className="h-7 w-12" /> : (summary?.well_count ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">DCA Analyses</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {summaryLoading ? <Skeleton className="h-7 w-12" /> : (summary?.dca_count ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">MB Analyses</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {summaryLoading ? <Skeleton className="h-7 w-12" /> : (summary?.mb_count ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Well Tests</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {summaryLoading ? <Skeleton className="h-7 w-12" /> : (summary?.wt_count ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Total EUR</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold text-primary">
            {summaryLoading ? <Skeleton className="h-7 w-20" /> : formatCumulative(summary?.total_eur ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Last Production</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-medium">
            {summaryLoading ? <Skeleton className="h-5 w-24" /> : formatDate(summary?.last_production_date)}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="wells">
        <TabsList>
          <TabsTrigger value="wells">Wells</TabsTrigger>
          <TabsTrigger value="dca">DCA Analyses</TabsTrigger>
          <TabsTrigger value="mb">Material Balance</TabsTrigger>
          <TabsTrigger value="wt">Well Tests</TabsTrigger>
          <TabsTrigger value="summary">Production Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="wells">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Wells ({wells.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wellsLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <WellTable data={wells} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dca">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Project DCA Analyses</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={batchModelType} onValueChange={setBatchModelType}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exponential" className="text-xs">Exponential</SelectItem>
                      <SelectItem value="hyperbolic" className="text-xs">Hyperbolic</SelectItem>
                      <SelectItem value="harmonic" className="text-xs">Harmonic</SelectItem>
                      <SelectItem value="stretched_exponential" className="text-xs">SEPD</SelectItem>
                      <SelectItem value="duong" className="text-xs">Duong</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={batchFluidType} onValueChange={setBatchFluidType}>
                    <SelectTrigger className="h-8 w-[80px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oil" className="text-xs">Oil</SelectItem>
                      <SelectItem value="gas" className="text-xs">Gas</SelectItem>
                      <SelectItem value="water" className="text-xs">Water</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleBatchDCA}
                    disabled={batchDCA.isPending || wells.length === 0}
                  >
                    {batchDCA.isPending ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="mr-1 h-3 w-3" />
                        Batch DCA ({wells.length} wells)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {dcaLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : dcaAnalyses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No DCA analyses found. Use &quot;Batch DCA&quot; to run analysis on all wells.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Well</TableHead>
                        <TableHead className="text-xs">Analysis</TableHead>
                        <TableHead className="text-xs">Model</TableHead>
                        <TableHead className="text-right text-xs">R²</TableHead>
                        <TableHead className="text-right text-xs">EUR</TableHead>
                        <TableHead className="text-xs">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dcaAnalyses.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs font-medium">
                            <Link href={`/wells/${a.well_id}/dca`} className="hover:underline text-primary">
                              {a.well_name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs">{a.name}</TableCell>
                          <TableCell className="text-xs capitalize">{a.model_type.replaceAll("_", " ")}</TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {a.r_squared != null ? a.r_squared.toFixed(4) : "--"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-primary">
                            {formatCumulative(a.eur)}
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(a.updated_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mb">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Material Balance Analyses</CardTitle>
            </CardHeader>
            <CardContent>
              {mbLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : mbAnalyses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No material balance analyses found. Run analyses from individual well pages.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Well</TableHead>
                        <TableHead className="text-xs">Analysis</TableHead>
                        <TableHead className="text-xs">Method</TableHead>
                        <TableHead className="text-right text-xs">OOIP (STB)</TableHead>
                        <TableHead className="text-xs">Drive Mechanism</TableHead>
                        <TableHead className="text-xs">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mbAnalyses.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs font-medium">
                            <Link href={`/wells/${a.well_id}/material-balance`} className="hover:underline text-primary">
                              {a.well_name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs">{a.name}</TableCell>
                          <TableCell className="text-xs capitalize">{a.method.replace("_", " ")}</TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {a.ooip != null ? a.ooip.toLocaleString() : "--"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {a.drive_mechanism ? (
                              <Badge variant="outline" className="text-[10px]">
                                {a.drive_mechanism}
                              </Badge>
                            ) : "--"}
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(a.updated_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wt">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Well Test Analyses</CardTitle>
            </CardHeader>
            <CardContent>
              {wtLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : wtAnalyses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No well test analyses found. Run analyses from individual well pages.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Well</TableHead>
                        <TableHead className="text-xs">Analysis</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-right text-xs">k (mD)</TableHead>
                        <TableHead className="text-right text-xs">Skin</TableHead>
                        <TableHead className="text-xs">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wtAnalyses.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs font-medium">
                            <Link href={`/wells/${a.well_id}/well-test`} className="hover:underline text-primary">
                              {a.well_name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs">{a.name}</TableCell>
                          <TableCell className="text-xs capitalize">{a.test_type}</TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {a.permeability != null ? a.permeability.toFixed(2) : "--"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {a.skin_factor != null ? a.skin_factor.toFixed(2) : "--"}
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(a.updated_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aggregated Production</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <SummaryMetric label="Total Cum Oil" value={formatCumulative(summary?.total_cum_oil ?? 0, "bbl")} />
                  <SummaryMetric label="Total Cum Gas" value={formatCumulative(summary?.total_cum_gas ?? 0, "Mcf")} />
                  <SummaryMetric label="Total Cum Water" value={formatCumulative(summary?.total_cum_water ?? 0, "bbl")} />
                  <SummaryMetric label="Remaining Reserves" value={formatCumulative(summary?.total_remaining_reserves ?? 0)} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-semibold">{value}</p>
    </div>
  );
}
