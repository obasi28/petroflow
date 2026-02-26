"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BUBBLE_POINT_CORRELATIONS,
  RS_CORRELATIONS,
  BO_CORRELATIONS,
  VISCOSITY_CORRELATIONS,
} from "@/types/pvt";
import type { PVTCalculateRequest } from "@/types/pvt";

interface PVTCorrelationSelectorProps {
  inputs: PVTCalculateRequest;
  onChange: (inputs: PVTCalculateRequest) => void;
}

export function PVTCorrelationSelector({ inputs, onChange }: PVTCorrelationSelectorProps) {
  const update = (field: keyof PVTCalculateRequest, value: string) => {
    onChange({ ...inputs, [field]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Correlations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Bubble Point / Rs</Label>
          <Select
            value={inputs.correlation_bubble_point || "standing"}
            onValueChange={(v) => {
              update("correlation_bubble_point", v);
              update("correlation_rs", v);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BUBBLE_POINT_CORRELATIONS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Oil FVF (Bo)</Label>
          <Select
            value={inputs.correlation_bo || "standing"}
            onValueChange={(v) => update("correlation_bo", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BO_CORRELATIONS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Dead Oil Viscosity</Label>
          <Select
            value={inputs.correlation_dead_oil_viscosity || "beggs_robinson"}
            onValueChange={(v) => update("correlation_dead_oil_viscosity", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VISCOSITY_CORRELATIONS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Z-Factor: Dranchuk-Abou-Kassem (1975) • Gas Viscosity: Lee-Gonzalez-Eakin (1966)
        </p>
      </CardContent>
    </Card>
  );
}
