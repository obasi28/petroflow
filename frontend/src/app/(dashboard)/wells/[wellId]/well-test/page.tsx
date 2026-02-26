"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  useAnalyzeWellTest,
  useWellTestAnalyses,
  useSaveWellTest,
  useDeleteWellTest,
} from "@/hooks/use-well-test";
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

/* ---------- Synthetic drawdown data for demo ---------- */
function generateSyntheticDrawdown(): { time: number[]; pressure: number[] } {
  const time: number[] = [];
  const pressure: number[] = [];
  const pi = 3500;
  const q = 250;
  const k = 50;
  const h = 50;
  const mu = 0.8;
  const bo = 1.2;
  const phi = 0.15;
  const ct = 1.5e-5;
  const rw = 0.35;
  const s = 2;

  // m = 162.6 * q * mu * bo / (k * h)
  const m = (162.6 * q * mu * bo) / (k * h);
  // Pwf = Pi - m * [log10(t) + log10(k/(phi*mu*ct*rw^2)) - 3.23 + 0.87*s]
  const logArg = Math.log10(k / (phi * mu * ct * rw * rw)) - 3.23 + 0.87 * s;

  // Generate 50 logarithmically-spaced time points from 0.01 to 100 hrs
  for (let i = 0; i < 50; i++) {
    const t = 0.01 * Math.pow(10, (i / 49) * 4); // 0.01 to 100 hrs
    time.push(parseFloat(t.toFixed(4)));
    const pwf = pi - m * (Math.log10(t) + logArg);
    // Add slight noise for realism
    const noise = (Math.random() - 0.5) * 3;
    pressure.push(parseFloat((pwf + noise).toFixed(1)));
  }

  return { time, pressure };
}

const synth = generateSyntheticDrawdown();

const DEFAULT_INPUTS: WellTestAnalyzeRequest = {
  time: synth.time,
  pressure: synth.pressure,
  rate: 250,
  test_type: "drawdown",
  tp: null,
  pwf_at_shutin: null,
  well_params: {
    mu: 0.8,
    bo: 1.2,
    h: 50,
    phi: 0.15,
    ct: 1.5e-5,
    rw: 0.35,
    pi: 3500,
  },
};

export default function WellTestPage() {
  const params = useParams();
  const wellId = params.wellId as string;

  const [inputs, setInputs] = useState<WellTestAnalyzeRequest>(DEFAULT_INPUTS);
  const [result, setResult] = useState<WellTestAnalyzeResponse | null>(null);
  const [chartMode, setChartMode] = useState<"log_log" | "semi_log">("log_log");
  const [analysisName, setAnalysisName] = useState("");

  const analyzeMutation = useAnalyzeWellTest();
  const saveMutation = useSaveWellTest(wellId);
  const deleteMutation = useDeleteWellTest(wellId);
  const { data: analysesData } = useWellTestAnalyses(wellId);
  const savedAnalyses = analysesData?.data || [];

  // Auto-load most recent saved analysis on first mount
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (!autoLoaded.current && savedAnalyses.length > 0 && !result) {
      autoLoaded.current = true;
      const latest = savedAnalyses[0];
      const storedResults = latest.results as unknown as WellTestAnalyzeResponse;
      if (storedResults?.test_type) {
        setResult(storedResults);
      }
      const storedData = latest.test_data as { inputs?: WellTestAnalyzeRequest };
      if (storedData?.inputs) {
        setInputs(storedData.inputs);
      }
    }
  }, [savedAnalyses, result]);

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
            setResult(response.data);
            toast.success(
              `Analysis complete: k = ${response.data.summary.permeability_md.toFixed(1)} md, S = ${response.data.summary.skin_factor.toFixed(2)}`,
            );
          }
        },
        onError: () => toast.error("Well test analysis failed"),
      },
    );
  }, [inputs, wellId, analyzeMutation]);

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
          setAnalysisName("");
        },
        onError: () => toast.error("Failed to save analysis"),
      },
    );
  }, [result, analysisName, inputs, saveMutation]);

  const handleLoadAnalysis = useCallback((analysis: WellTestAnalysis) => {
    const storedResults = analysis.results as unknown as WellTestAnalyzeResponse;
    setResult(storedResults);

    const storedData = analysis.test_data as { inputs?: WellTestAnalyzeRequest };
    if (storedData?.inputs) {
      setInputs(storedData.inputs);
    }
    toast.success(`Loaded: ${analysis.name}`);
  }, []);

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
        <WellTestInputForm inputs={inputs} onChange={setInputs} />

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
                onChange={(e) => setAnalysisName(e.target.value)}
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
                      onClick={() => setChartMode(key)}
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
