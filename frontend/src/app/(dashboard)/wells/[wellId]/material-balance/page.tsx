"use client";

import { useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  useCalculateMB,
  useMBAnalyses,
  useSaveMBAnalysis,
  useDeleteMBAnalysis,
} from "@/hooks/use-material-balance";
import { useMBStore } from "@/stores/material-balance-store";
import { MaterialBalanceInputForm } from "@/components/material-balance/material-balance-input-form";
import { MaterialBalanceChart } from "@/components/material-balance/material-balance-chart";
import { DriveMechanismPanel } from "@/components/material-balance/drive-mechanism-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Play, Save, Trash2 } from "lucide-react";
import type {
  MaterialBalanceCalculateRequest,
  MaterialBalanceCalculateResponse,
  MaterialBalanceAnalysis,
} from "@/types/material-balance";

export default function MaterialBalancePage() {
  const params = useParams();
  const wellId = params.wellId as string;

  // Zustand store — state persists across tab switches within the same well
  const store = useMBStore();
  const { inputs, result, chartMode, analysisName, autoLoaded } = store.getWellState(wellId);

  const calculateMutation = useCalculateMB();
  const saveMutation = useSaveMBAnalysis(wellId);
  const deleteMutation = useDeleteMBAnalysis(wellId);
  const { data: analysesData } = useMBAnalyses(wellId);
  const savedAnalyses = analysesData?.data || [];

  // Auto-load most recent saved analysis (only once per well)
  useEffect(() => {
    if (!autoLoaded && savedAnalyses.length > 0 && !result) {
      store.setAutoLoaded(wellId);
      const latest = savedAnalyses[0];
      const savedInputs = latest.inputs as unknown as MaterialBalanceCalculateRequest;
      if (savedInputs.pressure_history) {
        store.setInputs(wellId, savedInputs);
      }
      const savedResults = latest.results as unknown as MaterialBalanceCalculateResponse;
      if (savedResults.ooip !== undefined) {
        store.setResult(wellId, savedResults);
      }
    }
  }, [savedAnalyses, result, autoLoaded, wellId, store]);

  const handleCalculate = useCallback(() => {
    calculateMutation.mutate(
      { wellId, payload: inputs },
      {
        onSuccess: (response) => {
          if (response.data) {
            store.setResult(wellId, response.data);
            const ooip = response.data.ooip;
            toast.success(
              ooip
                ? `OOIP = ${ooip.toLocaleString()} STB (${response.data.drive_mechanism})`
                : "Material balance calculation complete",
            );
          } else if (response.errors) {
            toast.error(response.errors[0]?.message || "Calculation returned no results");
          }
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Material balance calculation failed"),
      },
    );
  }, [wellId, inputs, calculateMutation, store]);

  const handleSave = useCallback(() => {
    if (!result || !analysisName.trim()) {
      toast.error("Enter an analysis name and calculate first");
      return;
    }
    saveMutation.mutate(
      {
        name: analysisName.trim(),
        method: inputs.method,
        inputs: inputs as unknown as Record<string, unknown>,
        results: result as unknown as Record<string, unknown>,
        ooip: result.ooip,
        gas_cap_ratio: result.gas_cap_ratio,
        drive_mechanism: result.drive_mechanism,
      },
      {
        onSuccess: () => {
          toast.success("Analysis saved");
          store.setAnalysisName(wellId, "");
        },
        onError: () => toast.error("Failed to save analysis"),
      },
    );
  }, [result, analysisName, inputs, saveMutation, wellId, store]);

  const handleLoadAnalysis = useCallback(
    (analysis: MaterialBalanceAnalysis) => {
      const savedInputs =
        analysis.inputs as unknown as MaterialBalanceCalculateRequest;
      if (savedInputs.pressure_history) {
        store.setInputs(wellId, savedInputs);
      }
      const savedResults =
        analysis.results as unknown as MaterialBalanceCalculateResponse;
      if (savedResults.ooip !== undefined) {
        store.setResult(wellId, savedResults);
      }
      toast.success(`Loaded: ${analysis.name}`);
    },
    [wellId, store],
  );

  const handleDeleteAnalysis = useCallback(
    (analysisId: string) => {
      deleteMutation.mutate(analysisId, {
        onSuccess: () => toast.success("Analysis deleted"),
        onError: () => toast.error("Failed to delete analysis"),
      });
    },
    [deleteMutation],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_260px]">
      {/* Left Panel: Inputs */}
      <div className="space-y-3">
        <MaterialBalanceInputForm inputs={inputs} onChange={(v) => store.setInputs(wellId, v)} />

        <Button
          className="w-full"
          onClick={handleCalculate}
          disabled={calculateMutation.isPending}
        >
          {calculateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Calculate MB
        </Button>

        {/* Save Analysis */}
        {result && (
          <Card>
            <CardContent className="space-y-2 pt-4">
              <Input
                placeholder="Analysis name..."
                value={analysisName}
                onChange={(e) => store.setAnalysisName(wellId, e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSave}
                disabled={saveMutation.isPending || !analysisName.trim()}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Analysis
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Saved Analyses List */}
        {savedAnalyses.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Saved Analyses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {savedAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-muted/50"
                >
                  <button
                    className="flex-1 text-left"
                    onClick={() => handleLoadAnalysis(analysis)}
                  >
                    <div className="font-medium">{analysis.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {analysis.method} {analysis.ooip ? `-- OOIP: ${analysis.ooip.toLocaleString()}` : ""}
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-1"
                    onClick={() => handleDeleteAnalysis(analysis.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Center Panel: Charts */}
      <div className="space-y-4">
        {result ? (
          <Card>
            <CardContent className="pt-4">
              <div className="mb-2 flex gap-1">
                {(
                  [
                    ["f_vs_et", "F vs Et"],
                    ["campbell", "Campbell Plot"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={chartMode === key ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => store.setChartMode(wellId, key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <MaterialBalanceChart result={result} mode={chartMode} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-24">
              <div className="rounded-full bg-muted p-4">
                <Play className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-muted-foreground">
                Configure reservoir parameters and click Calculate MB
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Havlena-Odeh F vs Et plot, Campbell diagnostic, OOIP
                estimation, and drive mechanism analysis will be computed.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Panel: Results */}
      <div>
        {result ? (
          <DriveMechanismPanel result={result} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Results will appear after calculation.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
