"use client";

import { useState } from "react";
import { useRunMonteCarlo } from "@/hooks/use-dca";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import { BarChart3, Loader2 } from "lucide-react";
import {
  MODEL_PARAMETERS,
  getFluidRateUnit,
  getParameterUnit,
  type DCAModelType,
  type FluidType,
  type ParameterDistribution,
} from "@/types/dca";
import { toast } from "sonner";

interface MonteCarloDialogProps {
  wellId: string;
  analysisId: string;
  modelType: DCAModelType;
  fluidType: FluidType;
  fittedParams: Record<string, number>;
  onComplete: () => void;
}

export function MonteCarloDialog({
  wellId,
  analysisId,
  modelType,
  fluidType,
  fittedParams,
  onComplete,
}: MonteCarloDialogProps) {
  const [open, setOpen] = useState(false);
  const [iterations, setIterations] = useState(10000);
  const [economicLimit, setEconomicLimit] = useState(5.0);
  const [distributions, setDistributions] = useState<Record<string, ParameterDistribution>>(() => {
    const initial: Record<string, ParameterDistribution> = {};
    const params = MODEL_PARAMETERS[modelType] || [];
    params.forEach((p) => {
      const val = fittedParams[p] || 1;
      const isDeclineLike = p === "di" || p === "d_min" || p === "tau" || p === "a";
      initial[p] = {
        type: isDeclineLike ? "lognormal" : "normal",
        mean: val,
        std: Math.max(val * 0.1, 1e-6),
      };
    });
    return initial;
  });

  const runMC = useRunMonteCarlo(wellId, analysisId);

  function updateDistribution(param: string, field: string, value: string | number) {
    setDistributions((prev) => ({
      ...prev,
      [param]: { ...prev[param], [field]: value },
    }));
  }

  async function handleRun() {
    const result = await runMC.mutateAsync({
      iterations,
      param_distributions: distributions,
      economic_limit: economicLimit,
    });

    if (result.status === "success") {
      toast.success("Monte Carlo simulation complete");
      onComplete();
      setOpen(false);
    } else {
      toast.error("Monte Carlo simulation failed");
    }
  }

  const params = MODEL_PARAMETERS[modelType] || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BarChart3 className="mr-2 h-3.5 w-3.5" />
          Monte Carlo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Monte Carlo EUR Simulation</DialogTitle>
          <DialogDescription>
            Configure parameter distributions and run probabilistic EUR estimation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Iterations</Label>
              <Input
                type="number"
                value={iterations}
                onChange={(e) => setIterations(Number(e.target.value))}
                min={100}
                max={100000}
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

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Parameter Distributions
            </p>

            {params.map((param) => (
              <div key={param} className="space-y-1.5">
                <Label className="text-xs font-mono">
                  {param} ({getParameterUnit(param, fluidType)})
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={distributions[param]?.type || "normal"}
                    onValueChange={(v) => updateDistribution(param, "type", v)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                      <SelectItem value="lognormal" className="text-xs">Log-Normal</SelectItem>
                      <SelectItem value="uniform" className="text-xs">Uniform</SelectItem>
                      <SelectItem value="triangular" className="text-xs">Triangular</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="any"
                    value={distributions[param]?.mean ?? ""}
                    onChange={(e) => updateDistribution(param, "mean", Number(e.target.value))}
                    placeholder="Mean"
                    className="h-7 text-xs font-mono"
                  />
                  <Input
                    type="number"
                    step="any"
                    value={distributions[param]?.std ?? ""}
                    onChange={(e) => updateDistribution(param, "std", Number(e.target.value))}
                    placeholder="Std Dev"
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={runMC.isPending}>
            {runMC.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="mr-2 h-4 w-4" />
            )}
            Run Simulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
