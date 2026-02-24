"use client";

import { useParams } from "next/navigation";
import { useProject, useProjectDCA, useProjectSummary } from "@/hooks/use-projects";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCumulative, formatDate } from "@/lib/utils";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { data: projectData, isLoading: projectLoading } = useProject(projectId);
  const { data: projectSummaryData, isLoading: summaryLoading } = useProjectSummary(projectId);
  const { data: projectDCAData, isLoading: dcaLoading } = useProjectDCA(projectId);
  const { data: wellsData, isLoading: wellsLoading } = useWells({
    project_id: projectId,
    per_page: 100,
  });

  const project = projectData?.data;
  const wells = wellsData?.data || [];
  const summary = projectSummaryData?.data;
  const analyses = projectDCAData?.data || [];

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground">{project.description}</p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
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
              <CardTitle className="text-base">Project DCA Analyses</CardTitle>
            </CardHeader>
            <CardContent>
              {dcaLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : analyses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No analyses found yet for wells in this project.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Well</TableHead>
                        <TableHead className="text-xs">Analysis</TableHead>
                        <TableHead className="text-xs">Model</TableHead>
                        <TableHead className="text-right text-xs">R2</TableHead>
                        <TableHead className="text-right text-xs">EUR</TableHead>
                        <TableHead className="text-xs">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyses.map((analysis) => (
                        <TableRow key={analysis.id}>
                          <TableCell className="text-xs font-medium">{analysis.well_name}</TableCell>
                          <TableCell className="text-xs">{analysis.name}</TableCell>
                          <TableCell className="text-xs capitalize">{analysis.model_type.replaceAll("_", " ")}</TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            {analysis.r_squared != null ? analysis.r_squared.toFixed(4) : "--"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-primary">
                            {formatCumulative(analysis.eur)}
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(analysis.updated_at)}</TableCell>
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
