"use client";

import { useState } from "react";
import { useDCAStore } from "@/stores/dca-store";
import { useCreateDCA, useAutoFit } from "@/hooks/use-dca";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MODEL_LABELS,
  FLUID_LABELS,
  getFluidRateUnit,
  type DCAModelType,
  type FluidType,
  type ChartScale,
} from "@/types/dca";
import { Loader2, Play, Zap } from "lucide-react";
import { toast } from "sonner";

interface DCAControlsProps {
  wellId: string;
}

export function DCAControls({ wellId }: DCAControlsProps) {
  const {
    selectedModelType,
    setSelectedModelType,
    chartScale,
    setChartScale,
    showForecast,
    setShowForecast,
    setSelectedAnalysisId,
    autoFitResults,
    autoFitOverlayVisibility,
    setAutoFitResults,
    setAutoFitOverlayVisible,
    setAllAutoFitOverlays,
  } = useDCAStore();

  const [name, setName] = useState("DCA Analysis");
  const [fluidType, setFluidType] = useState<FluidType>("oil");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [forecastMonths, setForecastMonths] = useState(360);
  const [economicLimit, setEconomicLimit] = useState(5.0);

  const createDCA = useCreateDCA(wellId);
  const autoFit = useAutoFit();

  async function handleFitModel() {
    if (!startDate) {
      toast.error("Select a start date");
      return;
    }

    const result = await createDCA.mutateAsync({
      name,
      model_type: selectedModelType,
      fluid_type: fluidType,
      start_date: startDate,
      end_date: endDate || undefined,
      economic_limit: economicLimit,
      forecast_months: forecastMonths,
    });

    if (result.status === "success" && result.data) {
      setSelectedAnalysisId(result.data.id);
      toast.success(`${MODEL_LABELS[selectedModelType]} model fitted (R2 = ${result.data.r_squared?.toFixed(4) || "--"})`);
    } else {
      toast.error(result.errors?.[0]?.message || "Model fitting failed");
    }
  }

  async function handleAutoFit() {
    if (!startDate) {
      toast.error("Select a start date");
      return;
    }

    const result = await autoFit.mutateAsync({
      well_id: wellId,
      fluid_type: fluidType,
      start_date: startDate,
      end_date: endDate || undefined,
    });

    if (result.status === "success" && result.data) {
      setAutoFitResults(result.data);
      toast.success(`Auto-fit complete. ${result.data.length} models ranked by AIC.`);
    } else {
      toast.error(result.errors?.[0]?.message || "Auto-fit failed");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">DCA Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Name */}
        <div className="space-y-1.5">
          <Label className="text-xs">Analysis Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {/* Model Type */}
        <div className="space-y-1.5">
          <Label className="text-xs">Decline Model</Label>
          <Select
            value={selectedModelType}
            onValueChange={(v) => setSelectedModelType(v as DCAModelType)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MODEL_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fluid Type */}
        <div className="space-y-1.5">
          <Label className="text-xs">Fluid Type</Label>
          <Select value={fluidType} onValueChange={(v) => setFluidType(v as FluidType)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oil" className="text-xs">Oil</SelectItem>
              <SelectItem value="gas" className="text-xs">Gas</SelectItem>
              <SelectItem value="water" className="text-xs">Water</SelectItem>
              <SelectItem value="boe" className="text-xs">BOE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Forecast Config */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Forecast (months)</Label>
            <Input
              type="number"
              value={forecastMonths}
              onChange={(e) => setForecastMonths(Number(e.target.value))}
              min={1}
              max={600}
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Econ. Limit ({getFluidRateUnit(fluidType)})</Label>
            <Input
              type="number"
              value={economicLimit}
              onChange={(e) => setEconomicLimit(Number(e.target.value))}
              min={0}
              step={0.1}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>

        <Separator />

        {/* Chart Scale */}
        <div className="space-y-1.5">
          <Label className="text-xs">Chart Scale</Label>
          <Select value={chartScale} onValueChange={(v) => setChartScale(v as ChartScale)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear" className="text-xs">Linear</SelectItem>
              <SelectItem value="semi-log" className="text-xs">Semi-Log</SelectItem>
              <SelectItem value="log-log" className="text-xs">Log-Log</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle forecast overlay */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-forecast"
            checked={showForecast}
            onChange={(e) => setShowForecast(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          <Label htmlFor="show-forecast" className="text-xs cursor-pointer">
            Show forecast overlay
          </Label>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={handleFitModel}
            disabled={createDCA.isPending}
            className="w-full h-9"
            size="sm"
          >
            {createDCA.isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="mr-2 h-3.5 w-3.5" />
            )}
            Fit Model
          </Button>
          <Button
            onClick={handleAutoFit}
            disabled={autoFit.isPending}
            variant="outline"
            className="w-full h-9"
            size="sm"
          >
            {autoFit.isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="mr-2 h-3.5 w-3.5" />
            )}
            Auto-Fit All Models
          </Button>
        </div>

        {autoFitResults.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Auto-Fit Overlays</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => setAllAutoFitOverlays(true)}
                  >
                    Show all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => setAllAutoFitOverlays(false)}
                  >
                    Hide all
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                {[...autoFitResults]
                  .sort((a, b) => a.aic - b.aic)
                  .map((result, index) => (
                    <label
                      key={result.model_type}
                      className="flex cursor-pointer items-center justify-between rounded border border-border/60 px-2 py-1 text-[11px]"
                    >
                      <span>
                        #{index + 1} {MODEL_LABELS[result.model_type]} ({FLUID_LABELS[fluidType]})
                      </span>
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5"
                        checked={Boolean(autoFitOverlayVisibility[result.model_type])}
                        onChange={(e) =>
                          setAutoFitOverlayVisible(result.model_type, e.target.checked)
                        }
                      />
                    </label>
                  ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
