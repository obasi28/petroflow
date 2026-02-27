"use client";

import { useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  useAnalyzeWellTest,
  useWellTestAnalyses,
  useSaveWellTest,
  useDeleteWellTest,
} from "@/hooks/use-well-test";
import { useWTStore } from "@/stores/well-test-store";
import { WellTestInputForm } from "@/components/well-test/well-test-input-form";
import { WellTestDiagnosticChart } from "@/components/well-test/well-test-diagnostic-chart";
import { WellTestResultsPanel } from "@/components/well-test/well-test-results-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Play, Save, Trash2, Activity } from "lucide-react";
import type {
  WellTestAnalyzeRequest,
  WellTestAnalyzeResponse,
  WellTestAnalysis,
} from "@/types/well-test";

export default function WellTestPage() {
  const params = useParams();
  const wellId = params.wellId as string;

  // Zustand store — state persists across tab switches within the same well
  const store = useWTStore();
  const { inputs, result, chartMode, analysisName, autoLoaded } = store.getWellState(wellId);

  const analyzeMutation = useAnalyzeWellTest();
  const saveMutation = useSaveWellTest(wellId);
  const deleteMutation = useDeleteWellTest(wellId);
  const { data: analysesData } = useWellTestAnalyses(wellId);
  const savedAnalyses = analysesData?.data || [];

  // Auto-load most recent saved analysis (only once per well)
  useEffect(() => {
    if (!autoLoaded && savedAnalyses.length > 0 && !result) {
      store.setAutoLoaded(wellId);
      const latest = savedAnalyses[0];
      const storedResults = latest.results as unknown as WellTestAnalyzeResponse;
      if (storedResults?.test_type) {
        store.setResult(wellId, storedResults);
      }
      const storedData = latest.test_data as { inputs?: WellTestAnalyzeRequest };
      if (storedData?.inputs) {
        store.setInputs(wellId, storedData.inputs);
      }
    }
  }, [savedAnalyses, result, autoLoaded, wellId, store]);

  /* ---------- Handlers ---------- */

  const handleAnalyze = useCallback(() => {
    if (inputs.time.length < 3) {
      toast.error("At least 3 time/pressure points are required");
      return;
    }
    analyzeMutation.mutate(
      { wellId, payload: inputs },
      {
        onSuccess: (response) => {
          if (response.data) {
            store.setResult(wellId, response.data);
            toast.success(
              `Analysis complete: k = ${response.data.summary.permeability_md.toFixed(1)} md, S = ${response.data.summary.skin_factor.toFixed(2)}`,
            );
          }
        },
        onError: () => toast.error("Well test analysis failed"),
      },
    );
  }, [inputs, wellId, analyzeMutation, store]);

  const handleSave = useCallback(() => {
    if (!result || !analysisName.trim()) {
      toast.error("Enter a name and run the analysis first");
      return;
    }
    saveMutation.mutate(
      {
        name: analysisName.trim(),
        test_type: result.test_type,
        test_data: { inputs },
        results: result as unknown as Record<string, unknown>,
        permeability: result.permeability,
        skin_factor: result.skin_factor,
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

  const handleLoadAnalysis = useCallback((analysis: WellTestAnalysis) => {
    const storedResults = analysis.results as unknown as WellTestAnalyzeResponse;
    store.setResult(wellId, storedResults);

    const storedData = analysis.test_data as { inputs?: WellTestAnalyzeRequest };
    if (storedData?.inputs) {
      store.setInputs(wellId, storedData.inputs);
    }
    toast.success(`Loaded: ${analysis.name}`);
  }, [wellId, store]);

  const handleDeleteAnalysis = useCallback(
    (id: string) => {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Analysis deleted"),
        onError: () => toast.error("Failed to delete analysis"),
      });
    },
    [deleteMutation],
  );

  /* ---------- Render ---------- */

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_260px]">
      {/* Left Panel: Inputs */}
      <div className="space-y-3">
        <WellTestInputForm inputs={inputs} onChange={(v) => store.setInputs(wellId, v)} />

        <Button
          className="w-full"
          onClick={handleAnalyze}
          disabled={analyzeMutation.isPending}
        >
          {analyzeMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Analyze Well Test
        </Button>

        {/* Save */}
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
                      {analysis.test_type} &bull;{" "}
                      {analysis.permeability != null
                        ? `k=${analysis.permeability.toFixed(1)} md`
                        : ""}
                      {analysis.skin_factor != null
                        ? ` S=${analysis.skin_factor.toFixed(1)}`
                        : ""}
                    </div>
                  </button>
                  <button
                    className="ml-1 rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                    onClick={() => handleDeleteAnalysis(analysis.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Center Panel: Charts */}
      <div className="space-y-4">
        {result ? (
          <>
            <Card>
              <CardContent className="pt-4">
                <div className="mb-2 flex gap-1">
                  {(
                    [
                      ["log_log", "Log-Log Diagnostic"],
                      ["semi_log", result.test_type === "buildup" ? "Horner" : "Semi-Log"],
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
                <WellTestDiagnosticChart result={result} mode={chartMode} />
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-24">
              <div className="rounded-full bg-muted p-4">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-muted-foreground">
                Configure well parameters, paste test data, and click Analyze
                Well Test
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Permeability, skin factor, flow capacity, and diagnostic plots
                will be generated.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Panel: Results */}
      <div>
        {result ? (
          <WellTestResultsPanel result={result} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Results will appear after analysis.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
