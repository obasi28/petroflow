"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  useCalculateMB,
  useMBAnalyses,
  useSaveMBAnalysis,
  useDeleteMBAnalysis,
} from "@/hooks/use-material-balance";
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

const DEFAULT_INPUTS: MaterialBalanceCalculateRequest = {
  initial_pressure: 4000,
  boi: 1.2511,
  bgi: 0.00087,
  rsi: 510,
  method: "havlena_odeh",
  gas_cap_ratio: 0,
  swi: 0.2,
  cf: 0.000003,
  cw: 0.000003,
  pressure_history: [
    { pressure: 3900, np_cum: 500000, gp_cum: 255000, wp_cum: 0, wi_cum: 0, gi_cum: 0 },
    { pressure: 3800, np_cum: 1100000, gp_cum: 522500, wp_cum: 10000, wi_cum: 0, gi_cum: 0 },
    { pressure: 3700, np_cum: 1800000, gp_cum: 810000, wp_cum: 30000, wi_cum: 0, gi_cum: 0 },
    { pressure: 3600, np_cum: 2600000, gp_cum: 1118600, wp_cum: 60000, wi_cum: 0, gi_cum: 0 },
    { pressure: 3500, np_cum: 3500000, gp_cum: 1487500, wp_cum: 100000, wi_cum: 0, gi_cum: 0 },
  ],
  pvt_data: [
    { pressure: 4000, bo: 1.2511, bg: 0.00087, bw: 1.012, rs: 510 },
    { pressure: 3900, bo: 1.2353, bg: 0.00092, bw: 1.012, rs: 477 },
    { pressure: 3800, bo: 1.2222, bg: 0.00096, bw: 1.012, rs: 450 },
    { pressure: 3700, bo: 1.2100, bg: 0.00101, bw: 1.013, rs: 425 },
    { pressure: 3600, bo: 1.1990, bg: 0.00107, bw: 1.013, rs: 401 },
  ],
};

export default function MaterialBalancePage() {
  const params = useParams();
  const wellId = params.wellId as string;

  const [inputs, setInputs] =
    useState<MaterialBalanceCalculateRequest>(DEFAULT_INPUTS);
  const [result, setResult] =
    useState<MaterialBalanceCalculateResponse | null>(null);
  const [chartMode, setChartMode] = useState<"f_vs_et" | "campbell">(
    "f_vs_et",
  );
  const [analysisName, setAnalysisName] = useState("");

  const calculateMutation = useCalculateMB();
  const saveMutation = useSaveMBAnalysis(wellId);
  const deleteMutation = useDeleteMBAnalysis(wellId);
  const { data: analysesData } = useMBAnalyses(wellId);
  const savedAnalyses = analysesData?.data || [];

  // Auto-load most recent saved analysis on first mount
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (!autoLoaded.current && savedAnalyses.length > 0 && !result) {
      autoLoaded.current = true;
      const latest = savedAnalyses[0];
      const savedInputs = latest.inputs as unknown as MaterialBalanceCalculateRequest;
      if (savedInputs.pressure_history) {
        setInputs(savedInputs);
      }
      const savedResults = latest.results as unknown as MaterialBalanceCalculateResponse;
      if (savedResults.ooip !== undefined) {
        setResult(savedResults);
      }
    }
  }, [savedAnalyses, result]);

  const handleCalculate = useCallback(() => {
    calculateMutation.mutate(
      { wellId, payload: inputs },
      {
        onSuccess: (response) => {
          if (response.data) {
            setResult(response.data);
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
  }, [wellId, inputs, calculateMutation]);

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
          setAnalysisName("");
        },
        onError: () => toast.error("Failed to save analysis"),
      },
    );
  }, [result, analysisName, inputs, saveMutation]);

  const handleLoadAnalysis = useCallback(
    (analysis: MaterialBalanceAnalysis) => {
      const savedInputs =
        analysis.inputs as unknown as MaterialBalanceCalculateRequest;
      if (savedInputs.pressure_history) {
        setInputs(savedInputs);
      }
      const savedResults =
        analysis.results as unknown as MaterialBalanceCalculateResponse;
      if (savedResults.ooip !== undefined) {
        setResult(savedResults);
      }
      toast.success(`Loaded: ${analysis.name}`);
    },
    [],
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
        <MaterialBalanceInputForm inputs={inputs} onChange={setInputs} />

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
                    onClick={() => setChartMode(key)}
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
