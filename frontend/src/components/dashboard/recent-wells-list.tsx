"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Well } from "@/types/well";
import { formatDate } from "@/lib/utils";

interface RecentWellsListProps {
  wells: Well[];
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  shut_in: "secondary",
  plugged: "destructive",
  drilling: "outline",
  completing: "outline",
};

export function RecentWellsList({ wells }: RecentWellsListProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Wells</CardTitle>
      </CardHeader>
      <CardContent>
        {wells.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No wells yet. Create your first well to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {wells.slice(0, 5).map((well) => (
              <Link
                key={well.id}
                href={`/wells/${well.id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{well.well_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {well.basin && <span>{well.basin}</span>}
                    <span>{formatDate(well.updated_at)}</span>
                  </div>
                </div>
                <Badge
                  variant={statusVariant[well.well_status] || "outline"}
                  className="text-[10px]"
                >
                  {well.well_status.replace("_", " ")}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
