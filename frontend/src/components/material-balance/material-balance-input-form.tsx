"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { MB_METHODS } from "@/types/material-balance";
import type {
  MaterialBalanceCalculateRequest,
  PressureStepInput,
  PVTDataInput,
} from "@/types/material-balance";

interface MaterialBalanceInputFormProps {
  inputs: MaterialBalanceCalculateRequest;
  onChange: (inputs: MaterialBalanceCalculateRequest) => void;
}

export function MaterialBalanceInputForm({
  inputs,
  onChange,
}: MaterialBalanceInputFormProps) {
  const updateField = useCallback(
    (field: keyof MaterialBalanceCalculateRequest, value: unknown) => {
      onChange({ ...inputs, [field]: value });
    },
    [inputs, onChange],
  );

  const updatePressureStep = useCallback(
    (index: number, field: keyof PressureStepInput, value: number) => {
      const updated = [...inputs.pressure_history];
      updated[index] = { ...updated[index], [field]: value };
      onChange({ ...inputs, pressure_history: updated });
    },
    [inputs, onChange],
  );

  const addPressureStep = useCallback(() => {
    onChange({
      ...inputs,
      pressure_history: [
        ...inputs.pressure_history,
        { pressure: 0, np_cum: 0, gp_cum: 0, wp_cum: 0, wi_cum: 0, gi_cum: 0 },
      ],
    });
  }, [inputs, onChange]);

  const removePressureStep = useCallback(
    (index: number) => {
      const updated = inputs.pressure_history.filter((_, i) => i !== index);
      onChange({ ...inputs, pressure_history: updated });
    },
    [inputs, onChange],
  );

  const updatePVTRow = useCallback(
    (index: number, field: keyof PVTDataInput, value: number) => {
      const updated = [...inputs.pvt_data];
      updated[index] = { ...updated[index], [field]: value };
      onChange({ ...inputs, pvt_data: updated });
    },
    [inputs, onChange],
  );

  const addPVTRow = useCallback(() => {
    onChange({
      ...inputs,
      pvt_data: [
        ...inputs.pvt_data,
        { pressure: 0, bo: 1.0, bg: 0.001, bw: 1.0, rs: 0 },
      ],
    });
  }, [inputs, onChange]);

  const removePVTRow = useCallback(
    (index: number) => {
      const updated = inputs.pvt_data.filter((_, i) => i !== index);
      onChange({ ...inputs, pvt_data: updated });
    },
    [inputs, onChange],
  );

  return (
    <div className="space-y-3">
      {/* Method Selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Method</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={inputs.method}
            onValueChange={(v) => updateField("method", v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MB_METHODS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Reservoir Parameters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reservoir Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Pi (psia)</Label>
              <Input
                type="number"
                step={10}
                value={inputs.initial_pressure}
                onChange={(e) =>
                  updateField(
                    "initial_pressure",
                    parseFloat(e.target.value) || 0,
                  )
                }
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Boi (rb/stb)</Label>
              <Input
                type="number"
                step={0.001}
                value={inputs.boi}
                onChange={(e) =>
                  updateField("boi", parseFloat(e.target.value) || 1.0)
                }
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Bgi (rb/scf)</Label>
              <Input
                type="number"
                step={0.0001}
                value={inputs.bgi}
                onChange={(e) =>
                  updateField("bgi", parseFloat(e.target.value) || 0.001)
                }
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rsi (scf/stb)</Label>
              <Input
                type="number"
                step={10}
                value={inputs.rsi}
                onChange={(e) =>
                  updateField("rsi", parseFloat(e.target.value) || 0)
                }
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">m (gas cap ratio)</Label>
              <Input
                type="number"
                step={0.1}
                value={inputs.gas_cap_ratio ?? 0}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField(
                    "gas_cap_ratio",
                    val ? parseFloat(val) : null,
                  );
                }}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Swi (frac)</Label>
              <Input
                type="number"
                step={0.01}
                min={0}
                max={1}
                value={inputs.swi ?? 0.2}
                onChange={(e) =>
                  updateField("swi", parseFloat(e.target.value) || 0.2)
                }
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cf (1/psi)</Label>
              <Input
                type="number"
                step={0.000001}
                value={inputs.cf ?? 0.000003}
                onChange={(e) =>
                  updateField("cf", parseFloat(e.target.value) || 0)
                }
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cw (1/psi)</Label>
              <Input
                type="number"
                step={0.000001}
                value={inputs.cw ?? 0.000003}
                onChange={(e) =>
                  updateField("cw", parseFloat(e.target.value) || 0)
                }
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pressure History Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Pressure History</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={addPressureStep}
            >
              <Plus className="mr-1 h-3 w-3" />
              Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_24px] gap-1 text-[10px] font-medium text-muted-foreground">
              <span>P (psia)</span>
              <span>Np (stb)</span>
              <span>Gp (Mscf)</span>
              <span>Wp (stb)</span>
              <span />
            </div>
            {/* Rows */}
            {inputs.pressure_history.map((step, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_24px] gap-1"
              >
                <Input
                  type="number"
                  value={step.pressure}
                  onChange={(e) =>
                    updatePressureStep(
                      i,
                      "pressure",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="h-7 text-[11px] font-mono"
                />
                <Input
                  type="number"
                  value={step.np_cum}
                  onChange={(e) =>
                    updatePressureStep(
                      i,
                      "np_cum",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="h-7 text-[11px] font-mono"
                />
                <Input
                  type="number"
                  value={step.gp_cum}
                  onChange={(e) =>
                    updatePressureStep(
                      i,
                      "gp_cum",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="h-7 text-[11px] font-mono"
                />
                <Input
                  type="number"
                  value={step.wp_cum}
                  onChange={(e) =>
                    updatePressureStep(
                      i,
                      "wp_cum",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="h-7 text-[11px] font-mono"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-6 p-0"
                  onClick={() => removePressureStep(i)}
                  disabled={inputs.pressure_history.length <= 2}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PVT Data Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">PVT Data</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={addPVTRow}
            >
              <Plus className="mr-1 h-3 w-3" />
              Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_24px] gap-1 text-[10px] font-medium text-muted-foreground">
              <span>P (psia)</span>
              <span>Bo</span>
              <span>Bg</span>
              <span>Bw</span>
              <span>Rs</span>
              <span />
            </div>
            {/* Rows */}
            {inputs.pvt_data.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_24px] gap-1"
              >
                <Input
                  type="number"
                  value={row.pressure}
                  onChange={(e) =>
                    updatePVTRow(
                      i,
                      "pressure",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="h-7 text-[11px] font-mono"
                />
                <Input
                  type="number"
                  step={0.001}
                  value={row.bo}
                  onChange={(e) =>
                    updatePVTRow(
                      i,
                      "bo",
                      parseFloat(e.target.value) || 1.0,
                    )
                  }
                  className="h-7 text-[11px] font-mono"
                />
                <Input
                  type="number"
                  step={0.0001}
                  value={row.bg}
                  onChange={(e) =>
                    updatePVTRow(
                      i,
                      "bg",
                      parseFloat(e.target.value) || 0.001,
                    )
                  }
                  className="h-7 text-[11px] font-mono"
                />
                <Input
                  type="number"
                  step={0.001}
                  value={row.bw}
                  onChange={(e) =>
                    updatePVTRow(
                      i,
                      "bw",
                      parseFloat(e.target.value) || 1.0,
                    )
                  }
                  className="h-7 text-[11px] font-mono"
                />
                <Input
                  type="number"
                  step={1}
                  value={row.rs}
                  onChange={(e) =>
                    updatePVTRow(
                      i,
                      "rs",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="h-7 text-[11px] font-mono"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-6 p-0"
                  onClick={() => removePVTRow(i)}
                  disabled={inputs.pvt_data.length <= 2}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
