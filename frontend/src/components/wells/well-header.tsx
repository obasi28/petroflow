"use client";

import Link from "next/link";
import type { Well } from "@/types/well";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface WellHeaderProps {
  well: Well;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  shut_in: "secondary",
  plugged: "destructive",
  drilling: "outline",
  completing: "outline",
};

export function WellHeader({ well }: WellHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {well.well_name}
            </h1>
            <Badge variant={statusVariant[well.well_status] || "outline"}>
              {well.well_status.replace("_", " ")}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {well.api_number && (
              <span className="font-mono">API: {well.api_number}</span>
            )}
            {well.basin && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {well.basin}
                {well.county && `, ${well.county}`}
                {well.state_province && `, ${well.state_province}`}
              </span>
            )}
            {well.operator && <span>Op: {well.operator}</span>}
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/wells/${well.id}/edit`}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Well Type"
          value={well.well_type.replace("_", " / ")}
        />
        <MetricCard
          label="Orientation"
          value={well.orientation}
        />
        <MetricCard
          label="First Prod."
          value={formatDate(well.first_prod_date)}
        />
        <MetricCard
          label="Formation"
          value={well.formation || "--"}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}
