"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useProduction, useProductionStats } from "@/hooks/use-production";
import { ProductionChart } from "@/components/production/production-chart";
import { ProductionTable } from "@/components/production/production-table";
import { ProductionStats } from "@/components/production/production-stats";
import { ProductionEntryDialog } from "@/components/production/production-entry-dialog";
import { ProductionDeleteDialog } from "@/components/production/production-delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ExportButton } from "@/components/shared/export-button";
import type { ProductionRecord } from "@/types/production";

export default function ProductionPage() {
  const params = useParams();
  const wellId = params.wellId as string;

  const { data: prodData, isLoading: prodLoading } = useProduction(wellId, { per_page: 1000 });
  const { data: statsData } = useProductionStats(wellId);

  const records = prodData?.data || [];
  const stats = statsData?.data;

  // Dialog state
  const [entryOpen, setEntryOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ProductionRecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteDates, setDeleteDates] = useState<string[]>([]);

  const handleEdit = (record: ProductionRecord) => {
    setEditRecord(record);
    setEntryOpen(true);
  };

  const handleDelete = (dates: string[]) => {
    setDeleteDates(dates);
    setDeleteOpen(true);
  };

  const handleEntryClose = (open: boolean) => {
    setEntryOpen(open);
    if (!open) setEditRecord(null);
  };

  if (prodLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[350px] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      {records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">No production data available.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Import data from the Import tab or add records manually.
            </p>
            <Button className="mt-4" onClick={() => setEntryOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Record
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Header with Export + Add buttons */}
          <div className="flex items-center justify-end gap-2">
            <ExportButton
              path={`/wells/${wellId}/production/export`}
              filename={`production_${wellId}.csv`}
              label="Export CSV"
            />
            <Button size="sm" onClick={() => setEntryOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Record
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-6">
              <ProductionChart data={records} />
              <ProductionTable
                data={records}
                onEdit={handleEdit}
                onDeleteSelected={handleDelete}
              />
            </div>
            <div>{stats && <ProductionStats stats={stats} />}</div>
          </div>
        </div>
      )}

      {/* Entry/Edit Dialog */}
      <ProductionEntryDialog
        wellId={wellId}
        open={entryOpen}
        onOpenChange={handleEntryClose}
        editRecord={editRecord}
      />

      {/* Delete Confirmation Dialog */}
      <ProductionDeleteDialog
        wellId={wellId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        selectedDates={deleteDates}
      />
    </>
  );
}
