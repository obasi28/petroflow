"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useCalculatePVT, usePVTStudies, useSavePVTStudy } from "@/hooks/use-pvt";
import { PVTInputForm } from "@/components/pvt/pvt-input-form";
import { PVTCorrelationSelector } from "@/components/pvt/pvt-correlation-selector";
import { PVTChart } from "@/components/pvt/pvt-chart";
import { PVTPropertiesTable } from "@/components/pvt/pvt-properties-table";
import { PVTResultsCards } from "@/components/pvt/pvt-results-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Play, Save, Trash2 } from "lucide-react";
import type { PVTCalculateRequest, PVTCalculateResponse, PVTStudy } from "@/types/pvt";

const DEFAULT_INPUTS: PVTCalculateRequest = {
  api_gravity: 35,
  gas_gravity: 0.75,
  temperature: 200,
  separator_pressure: 100,
  separator_temperature: 60,
  rs_at_pb: 500,
  max_pressure: 6000,
  num_points: 50,
  correlation_bubble_point: "standing",
  correlation_rs: "standing",
  correlation_bo: "standing",
  correlation_dead_oil_viscosity: "beggs_robinson",
};

export default function PVTPage() {
  const params = useParams();
  const wellId = params.wellId as string;

  const [inputs, setInputs] = useState<PVTCalculateRequest>(DEFAULT_INPUTS);
  const [result, setResult] = useState<PVTCalculateResponse | null>(null);
  const [chartMode, setChartMode] = useState<"bo_rs" | "viscosity" | "z_factor">("bo_rs");
  const [studyName, setStudyName] = useState("");

  const calculateMutation = useCalculatePVT();
  const saveMutation = useSavePVTStudy(wellId);
  const { data: studiesData } = usePVTStudies(wellId);
  const savedStudies = studiesData?.data || [];

  const handleCalculate = useCallback(() => {
    calculateMutation.mutate(inputs, {
      onSuccess: (response) => {
        if (response.data) {
          setResult(response.data);
          toast.success(
            `PVT computed: Pb = ${response.data.bubble_point.toFixed(0)} psia`,
          );
        }
      },
      onError: () => toast.error("PVT calculation failed"),
    });
  }, [inputs, calculateMutation]);

  const handleSave = useCallback(() => {
    if (!result || !studyName.trim()) {
      toast.error("Enter a study name and calculate first");
      return;
    }
    saveMutation.mutate(
      {
        name: studyName.trim(),
        inputs: result.inputs,
        correlation_set: result.correlations_used,
        results: result,
      },
      {
        onSuccess: () => {
          toast.success("PVT study saved");
          setStudyName("");
        },
        onError: () => toast.error("Failed to save study"),
      },
    );
  }, [result, studyName, saveMutation]);

  const handleLoadStudy = useCallback((study: PVTStudy) => {
    setResult(study.results);
    setInputs({
      api_gravity: study.inputs.api_gravity ?? 35,
      gas_gravity: study.inputs.gas_gravity ?? 0.75,
      temperature: study.inputs.temperature ?? 200,
      separator_pressure: study.inputs.separator_pressure ?? 100,
      separator_temperature: study.inputs.separator_temperature ?? 60,
      rs_at_pb: study.inputs.rs_at_pb ?? null,
      max_pressure: 6000,
      num_points: 50,
      ...Object.fromEntries(
        Object.entries(study.correlation_set || {}).map(([k, v]) => [
          `correlation_${k}`,
          v,
        ]),
      ),
    });
    toast.success(`Loaded: ${study.name}`);
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr_260px]">
      {/* Left Panel: Inputs */}
      <div className="space-y-3">
        <PVTInputForm inputs={inputs} onChange={setInputs} />
        <PVTCorrelationSelector inputs={inputs} onChange={setInputs} />

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
          Calculate PVT
        </Button>

        {/* Save Study */}
        {result && (
          <Card>
            <CardContent className="space-y-2 pt-4">
              <Input
                placeholder="Study name..."
                value={studyName}
                onChange={(e) => setStudyName(e.target.value)}
                className="h-8 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleSave}
                disabled={saveMutation.isPending || !studyName.trim()}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Study
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Saved Studies List */}
        {savedStudies.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Saved Studies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {savedStudies.map((study) => (
                <button
                  key={study.id}
                  onClick={() => handleLoadStudy(study)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-muted/50"
                >
                  <div>
                    <div className="font-medium">{study.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      API {study.inputs.api_gravity}° • {study.inputs.temperature}°F
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Center Panel: Charts + Table */}
      <div className="space-y-4">
        {result ? (
          <>
            <Card>
              <CardContent className="pt-4">
                <div className="mb-2 flex gap-1">
                  {(
                    [
                      ["bo_rs", "Bo & Rs"],
                      ["viscosity", "Viscosity"],
                      ["z_factor", "Z-Factor & Bg"],
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
                <PVTChart result={result} mode={chartMode} />
              </CardContent>
            </Card>

            <Tabs defaultValue="table">
              <TabsList>
                <TabsTrigger value="table">Properties Table</TabsTrigger>
              </TabsList>
              <TabsContent value="table">
                <PVTPropertiesTable result={result} />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-24">
              <div className="rounded-full bg-muted p-4">
                <Play className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-muted-foreground">
                Configure fluid properties and click Calculate PVT
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Bo, Rs, viscosity, Z-factor, and gas properties will be computed across the pressure range.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Panel: Results */}
      <div>
        {result ? (
          <PVTResultsCards result={result} />
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
