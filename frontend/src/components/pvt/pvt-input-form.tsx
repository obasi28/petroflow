"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import type { PVTCalculateRequest } from "@/types/pvt";

interface PVTInputFormProps {
  inputs: PVTCalculateRequest;
  onChange: (inputs: PVTCalculateRequest) => void;
}

function apiToColor(api: number): string {
  // Green (light oil) → Orange (medium) → Red-brown (heavy)
  if (api >= 40) return "hsl(120, 50%, 45%)";
  if (api >= 30) return "hsl(80, 60%, 45%)";
  if (api >= 22) return "hsl(35, 80%, 45%)";
  if (api >= 15) return "hsl(20, 70%, 35%)";
  return "hsl(10, 60%, 25%)";
}

function apiLabel(api: number): string {
  if (api >= 40) return "Light Oil";
  if (api >= 30) return "Medium Oil";
  if (api >= 22) return "Intermediate";
  if (api >= 10) return "Heavy Oil";
  return "Extra Heavy";
}

export function PVTInputForm({ inputs, onChange }: PVTInputFormProps) {
  const update = useCallback(
    (field: keyof PVTCalculateRequest, value: number | null) => {
      onChange({ ...inputs, [field]: value });
    },
    [inputs, onChange],
  );

  return (
    <div className="space-y-3">
      {/* API Gravity with color indicator */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Fluid Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">API Gravity</Label>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: apiToColor(inputs.api_gravity) }}
                />
                <span className="text-xs font-mono text-muted-foreground">
                  {inputs.api_gravity.toFixed(1)}° — {apiLabel(inputs.api_gravity)}
                </span>
              </div>
            </div>
            <Slider
              min={10}
              max={60}
              step={0.5}
              value={[inputs.api_gravity]}
              onValueChange={([v]) => update("api_gravity", v)}
              className="[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>10° Heavy</span>
              <span>60° Light</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Gas Gravity (γg)</Label>
              <Input
                type="number"
                step={0.01}
                min={0.5}
                max={1.8}
                value={inputs.gas_gravity}
                onChange={(e) => update("gas_gravity", parseFloat(e.target.value) || 0.75)}
                className="h-8 text-xs font-mono"
              />
              <span className="text-[10px] text-muted-foreground">air = 1.0</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Temperature (°F)</Label>
              <Input
                type="number"
                step={1}
                min={60}
                max={500}
                value={inputs.temperature}
                onChange={(e) => update("temperature", parseFloat(e.target.value) || 200)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Rs at Bubble Point (scf/stb)</Label>
            <Input
              type="number"
              step={10}
              min={0}
              max={5000}
              value={inputs.rs_at_pb ?? ""}
              placeholder="Auto-estimate from pressure"
              onChange={(e) => {
                const val = e.target.value;
                update("rs_at_pb", val ? parseFloat(val) : null);
              }}
              className="h-8 text-xs font-mono"
            />
            <span className="text-[10px] text-muted-foreground">
              Leave blank to auto-estimate from max pressure
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Separator Conditions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Separator Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Pressure (psig)</Label>
              <Input
                type="number"
                step={10}
                min={0}
                max={3000}
                value={inputs.separator_pressure ?? 100}
                onChange={(e) => update("separator_pressure", parseFloat(e.target.value) || 100)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Temperature (°F)</Label>
              <Input
                type="number"
                step={1}
                min={40}
                max={200}
                value={inputs.separator_temperature ?? 60}
                onChange={(e) => update("separator_temperature", parseFloat(e.target.value) || 60)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation Range */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Calculation Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Max Pressure (psia)</Label>
              <Input
                type="number"
                step={100}
                min={100}
                max={20000}
                value={inputs.max_pressure ?? 6000}
                onChange={(e) => update("max_pressure", parseFloat(e.target.value) || 6000)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Points</Label>
              <Input
                type="number"
                step={10}
                min={10}
                max={200}
                value={inputs.num_points ?? 50}
                onChange={(e) => update("num_points", parseInt(e.target.value) || 50)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
