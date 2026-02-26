"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBatchCreateProduction } from "@/hooks/use-production";
import { toast } from "sonner";
import type { ProductionRecord } from "@/types/production";

interface ProductionEntryDialogProps {
  wellId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRecord?: ProductionRecord | null;
}

function nextMonth(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ProductionEntryDialog({
  wellId,
  open,
  onOpenChange,
  editRecord,
}: ProductionEntryDialogProps) {
  const batchCreate = useBatchCreateProduction(wellId);

  const [date, setDate] = useState(todayISO());
  const [oilRate, setOilRate] = useState("");
  const [gasRate, setGasRate] = useState("");
  const [waterRate, setWaterRate] = useState("");
  const [cumOil, setCumOil] = useState("");
  const [cumGas, setCumGas] = useState("");
  const [cumWater, setCumWater] = useState("");
  const [tubingP, setTubingP] = useState("");
  const [casingP, setCasingP] = useState("");
  const [flowingBHP, setFlowingBHP] = useState("");
  const [chokeSize, setChokeSize] = useState("");
  const [daysOn, setDaysOn] = useState("30");

  // Derived fields (auto-calculated)
  const oil = parseFloat(oilRate) || 0;
  const gas = parseFloat(gasRate) || 0;
  const water = parseFloat(waterRate) || 0;
  const gor = oil > 0 ? gas / oil : 0;
  const waterCut = oil + water > 0 ? water / (oil + water) : 0;
  const boe = oil + gas / 6;

  // Populate when editing
  useEffect(() => {
    if (editRecord) {
      setDate(editRecord.production_date);
      setOilRate(editRecord.oil_rate?.toString() ?? "");
      setGasRate(editRecord.gas_rate?.toString() ?? "");
      setWaterRate(editRecord.water_rate?.toString() ?? "");
      setCumOil(editRecord.cum_oil?.toString() ?? "");
      setCumGas(editRecord.cum_gas?.toString() ?? "");
      setCumWater(editRecord.cum_water?.toString() ?? "");
      setTubingP(editRecord.tubing_pressure?.toString() ?? "");
      setCasingP(editRecord.casing_pressure?.toString() ?? "");
      setFlowingBHP(editRecord.flowing_bhp?.toString() ?? "");
      setChokeSize(editRecord.choke_size?.toString() ?? "");
      setDaysOn(editRecord.days_on?.toString() ?? "30");
    } else {
      resetForm();
    }
  }, [editRecord, open]);

  function resetForm() {
    setDate(todayISO());
    setOilRate("");
    setGasRate("");
    setWaterRate("");
    setCumOil("");
    setCumGas("");
    setCumWater("");
    setTubingP("");
    setCasingP("");
    setFlowingBHP("");
    setChokeSize("");
    setDaysOn("30");
  }

  function buildRecord() {
    const record: Record<string, unknown> = { production_date: date };
    if (oilRate) record.oil_rate = parseFloat(oilRate);
    if (gasRate) record.gas_rate = parseFloat(gasRate);
    if (waterRate) record.water_rate = parseFloat(waterRate);
    if (cumOil) record.cum_oil = parseFloat(cumOil);
    if (cumGas) record.cum_gas = parseFloat(cumGas);
    if (cumWater) record.cum_water = parseFloat(cumWater);
    if (tubingP) record.tubing_pressure = parseFloat(tubingP);
    if (casingP) record.casing_pressure = parseFloat(casingP);
    if (flowingBHP) record.flowing_bhp = parseFloat(flowingBHP);
    if (chokeSize) record.choke_size = parseFloat(chokeSize);
    if (daysOn) record.days_on = parseInt(daysOn);
    return record;
  }

  function handleSave() {
    if (!date) {
      toast.error("Date is required");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    batchCreate.mutate({ records: [buildRecord()] } as any, {
      onSuccess: () => {
        toast.success(editRecord ? "Record updated" : "Record added");
        onOpenChange(false);
      },
      onError: () => toast.error("Failed to save record"),
    });
  }

  function handleSaveAndAdd() {
    if (!date) {
      toast.error("Date is required");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    batchCreate.mutate({ records: [buildRecord()] } as any, {
      onSuccess: () => {
        toast.success("Record added");
        // Advance date by 1 month and clear rate fields
        setDate(nextMonth(date));
        setOilRate("");
        setGasRate("");
        setWaterRate("");
        setCumOil("");
        setCumGas("");
        setCumWater("");
      },
      onError: () => toast.error("Failed to save record"),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editRecord ? "Edit Production Record" : "Add Production Record"}</DialogTitle>
          <DialogDescription>
            {editRecord
              ? "Update the production record for this date."
              : "Enter monthly production data. Ratios are auto-calculated."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date + Days On */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prod-date" className="text-xs">
                Production Date *
              </Label>
              <Input
                id="prod-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="days-on" className="text-xs">
                Days On
              </Label>
              <Input
                id="days-on"
                type="number"
                min="0"
                max="31"
                value={daysOn}
                onChange={(e) => setDaysOn(e.target.value)}
              />
            </div>
          </div>

          {/* Rate Fields */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Daily Rates
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="oil-rate" className="text-xs">
                  Oil (bbl/d)
                </Label>
                <Input
                  id="oil-rate"
                  type="number"
                  step="0.1"
                  min="0"
                  value={oilRate}
                  onChange={(e) => setOilRate(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gas-rate" className="text-xs">
                  Gas (Mcf/d)
                </Label>
                <Input
                  id="gas-rate"
                  type="number"
                  step="0.1"
                  min="0"
                  value={gasRate}
                  onChange={(e) => setGasRate(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="water-rate" className="text-xs">
                  Water (bbl/d)
                </Label>
                <Input
                  id="water-rate"
                  type="number"
                  step="0.1"
                  min="0"
                  value={waterRate}
                  onChange={(e) => setWaterRate(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* Auto-calculated ratios */}
          {(oil > 0 || gas > 0 || water > 0) && (
            <div className="rounded-md bg-muted/50 p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Calculated
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <span>GOR: {gor.toFixed(0)} Mcf/bbl</span>
                <span>WC: {(waterCut * 100).toFixed(1)}%</span>
                <span>BOE: {boe.toFixed(1)} boe/d</span>
              </div>
            </div>
          )}

          {/* Cumulative Fields */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Cumulative Production
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cum-oil" className="text-xs">
                  Cum Oil (bbl)
                </Label>
                <Input
                  id="cum-oil"
                  type="number"
                  step="1"
                  min="0"
                  value={cumOil}
                  onChange={(e) => setCumOil(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cum-gas" className="text-xs">
                  Cum Gas (Mcf)
                </Label>
                <Input
                  id="cum-gas"
                  type="number"
                  step="1"
                  min="0"
                  value={cumGas}
                  onChange={(e) => setCumGas(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cum-water" className="text-xs">
                  Cum Water (bbl)
                </Label>
                <Input
                  id="cum-water"
                  type="number"
                  step="1"
                  min="0"
                  value={cumWater}
                  onChange={(e) => setCumWater(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* Pressure Fields */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pressures & Operating
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tbg-p" className="text-xs">
                  THP (psi)
                </Label>
                <Input
                  id="tbg-p"
                  type="number"
                  step="1"
                  min="0"
                  value={tubingP}
                  onChange={(e) => setTubingP(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="csg-p" className="text-xs">
                  CHP (psi)
                </Label>
                <Input
                  id="csg-p"
                  type="number"
                  step="1"
                  min="0"
                  value={casingP}
                  onChange={(e) => setCasingP(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="choke" className="text-xs">
                  Choke (64ths)
                </Label>
                <Input
                  id="choke"
                  type="number"
                  step="1"
                  min="0"
                  value={chokeSize}
                  onChange={(e) => setChokeSize(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={batchCreate.isPending}>
              {batchCreate.isPending ? "Saving..." : editRecord ? "Update Record" : "Save"}
            </Button>
            {!editRecord && (
              <Button
                variant="outline"
                onClick={handleSaveAndAdd}
                disabled={batchCreate.isPending}
              >
                Save & Add Another
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
