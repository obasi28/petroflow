"use client";

import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

export const chartColors = {
  oil: "hsl(25, 95%, 53%)",
  gas: "hsl(0, 72%, 51%)",
  water: "hsl(210, 100%, 52%)",
  forecast: "hsl(142, 71%, 45%)",
  purple: "hsl(280, 65%, 60%)",
  grid: "hsl(240, 3.7%, 15.9%)",
  axis: "hsl(240, 5%, 64.9%)",
};

export function ChartContainer({ children }: { children: React.ReactNode }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      {children as React.ReactElement}
    </ResponsiveContainer>
  );
}

export function ChartGrid() {
  return (
    <CartesianGrid
      strokeDasharray="3 3"
      stroke={chartColors.grid}
      opacity={0.5}
    />
  );
}

export function ChartXAxis(props: Record<string, unknown>) {
  return (
    <XAxis
      stroke={chartColors.axis}
      fontSize={11}
      fontFamily="var(--font-mono)"
      tickLine={false}
      {...props}
    />
  );
}

export function ChartYAxis(props: Record<string, unknown>) {
  return (
    <YAxis
      stroke={chartColors.axis}
      fontSize={11}
      fontFamily="var(--font-mono)"
      tickLine={false}
      {...props}
    />
  );
}

export function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-medium">
            {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
