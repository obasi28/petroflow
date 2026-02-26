"use client";

import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductionRecord } from "@/types/production";

interface WellOverviewSparklineProps {
  records: ProductionRecord[];
  isLoading?: boolean;
}

export function WellOverviewSparkline({ records, isLoading }: WellOverviewSparklineProps) {
  // Use last 24 months of oil rate data
  const data = records
    .filter((r) => r.oil_rate != null)
    .slice(-24)
    .map((r) => ({
      date: r.production_date,
      rate: r.oil_rate ?? 0,
    }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Production Trend</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="h-[100px] animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Production Trend</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex h-[100px] items-center justify-center">
            <p className="text-xs text-muted-foreground">No production data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latest = data[data.length - 1];
  const first = data[0];
  const change = first.rate > 0 ? ((latest.rate - first.rate) / first.rate) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Oil Rate Trend</CardTitle>
          <div className="text-right">
            <span className="text-lg font-bold font-mono text-[hsl(25,95%,53%)]">
              {latest.rate.toFixed(0)}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">bbl/d</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="h-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <defs>
                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(25,95%,53%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(25,95%,53%)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "11px",
                }}
                labelFormatter={(label) => label}
                formatter={(value: number) => [`${value.toFixed(0)} bbl/d`, "Oil Rate"]}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="hsl(25,95%,53%)"
                strokeWidth={1.5}
                fill="url(#sparkGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{data[0].date}</span>
          <span className={change >= 0 ? "text-[hsl(142,71%,45%)]" : "text-[hsl(0,72%,51%)]"}>
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
          <span>{latest.date}</span>
        </div>
      </CardContent>
    </Card>
  );
}
