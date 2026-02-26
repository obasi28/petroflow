"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WellTestAnalyzeRequest, WellParamsInput } from "@/types/well-test";

interface WellTestInputFormProps {
  inputs: WellTestAnalyzeRequest;
  onChange: (inputs: WellTestAnalyzeRequest) => void;
}

export function WellTestInputForm({ inputs, onChange }: WellTestInputFormProps) {
  const updateParam = useCallback(
    (field: keyof WellParamsInput, value: number | null) => {
      onChange({
        ...inputs,
        well_params: { ...inputs.well_params, [field]: value },
      });
    },
    [inputs, onChange],
  );

  const updateField = useCallback(
    <K extends keyof WellTestAnalyzeRequest>(
      field: K,
      value: WellTestAnalyzeRequest[K],
    ) => {
      onChange({ ...inputs, [field]: value });
    },
    [inputs, onChange],
  );

  const handleTimePressPaste = useCallback(
    (raw: string) => {
      const lines = raw
        .trim()
        .split(/\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const time: number[] = [];
      const pressure: number[] = [];

      for (const line of lines) {
        const parts = line.split(/[\t,;\s]+/).map(Number);
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          time.push(parts[0]);
          pressure.push(parts[1]);
        }
      }

      if (time.length > 0) {
        onChange({ ...inputs, time, pressure });
      }
    },
    [inputs, onChange],
  );

  const isBuildup = inputs.test_type === "buildup";

  return (
    <div className="space-y-3">
      {/* Test Type */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Test Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={inputs.test_type}
            onValueChange={(v) =>
              updateField("test_type", v as "drawdown" | "buildup")
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="drawdown">Drawdown Test</SelectItem>
              <SelectItem value="buildup">Buildup Test</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Well Parameters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Well Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Viscosity, mu (cp)</Label>
              <Input
                type="number"
                step={0.1}
                min={0.01}
                value={inputs.well_params.mu}
                onChange={(e) =>
                  updateParam("mu", parseFloat(e.target.value) || 0.8)
                }
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bo (rb/stb)</Label>
              <Input
                type="number"
                step={0.01}
                min={0.9}
                value={inputs.well_params.bo}
                onChange={(e) =>
                  updateParam("bo", parseFloat(e.target.value) || 1.2)
                }
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Net Pay, h (ft)</Label>
              <Input
                type="number"
                step={1}
                min={1}
                value={inputs.well_params.h}
                onChange={(e) =>
                  updateParam("h", parseFloat(e.target.value) || 50)
                }
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Porosity, phi (frac)</Label>
              <Input
                type="number"
                step={0.01}
                min={0.01}
                max={0.5}
                value={inputs.well_params.phi}
                onChange={(e) =>
                  updateParam("phi", parseFloat(e.target.value) || 0.15)
                }
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Ct (1/psi)</Label>
              <Input
                type="number"
                step={0.000001}
                min={0.000001}
                value={inputs.well_params.ct}
                onChange={(e) =>
                  updateParam(
                    "ct",
                    parseFloat(e.target.value) || 1.5e-5,
                  )
                }
                className="h-8 text-xs font-mono"
              />
              <span className="text-[10px] text-muted-foreground">
                e.g. 1.5e-5
              </span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Wellbore radius, rw (ft)</Label>
              <Input
                type="number"
                step={0.01}
                min={0.01}
                value={inputs.well_params.rw}
                onChange={(e) =>
                  updateParam("rw", parseFloat(e.target.value) || 0.35)
                }
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Initial Pressure, Pi (psia)</Label>
            <Input
              type="number"
              step={10}
              min={0}
              value={inputs.well_params.pi ?? ""}
              placeholder="Optional"
              onChange={(e) => {
                const val = e.target.value;
                updateParam("pi", val ? parseFloat(val) : null);
              }}
              className="h-8 text-xs font-mono"
            />
            <span className="text-[10px] text-muted-foreground">
              Required for drawdown flow efficiency
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Buildup-specific */}
      {isBuildup && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Buildup Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">
                Producing time, tp (hrs)
              </Label>
              <Input
                type="number"
                step={1}
                min={0}
                value={inputs.tp ?? ""}
                placeholder="Required for Horner"
                onChange={(e) => {
                  const val = e.target.value;
                  updateField("tp", val ? parseFloat(val) : null);
                }}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Pwf at shut-in (psia)
              </Label>
              <Input
                type="number"
                step={1}
                min={0}
                value={inputs.pwf_at_shutin ?? ""}
                placeholder="Optional"
                onChange={(e) => {
                  const val = e.target.value;
                  updateField(
                    "pwf_at_shutin",
                    val ? parseFloat(val) : null,
                  );
                }}
                className="h-8 text-xs font-mono"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Flow Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <Label className="text-xs">Rate, q (STB/day)</Label>
            <Input
              type="number"
              step={10}
              min={1}
              value={inputs.rate}
              onChange={(e) =>
                updateField("rate", parseFloat(e.target.value) || 250)
              }
              className="h-8 text-xs font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Time / Pressure Data */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Test Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <span className="text-[10px] text-muted-foreground">
            Paste two columns: time (hrs) and pressure (psia), tab or comma
            separated. One row per line.
          </span>
          <textarea
            className="h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={`0.01\t3000\n0.02\t2980\n0.05\t2950\n...`}
            defaultValue={inputs.time
              .map((t, i) => `${t}\t${inputs.pressure[i]}`)
              .join("\n")}
            onBlur={(e) => handleTimePressPaste(e.target.value)}
          />
          <Separator />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{inputs.time.length} points loaded</span>
            <span>
              {inputs.time.length > 0
                ? `t: ${inputs.time[0]}\u2013${inputs.time[inputs.time.length - 1]} hrs`
                : "No data"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
