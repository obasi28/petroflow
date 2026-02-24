"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useProduction } from "@/hooks/use-production";
import { useDCAAnalyses } from "@/hooks/use-dca";
import { useDCAStore } from "@/stores/dca-store";
import { DCAChart } from "@/components/dca/dca-chart";
import { DCAControls } from "@/components/dca/dca-controls";
import { DCADataQualityPanel } from "@/components/dca/dca-data-quality-panel";
import { DCAParametersPanel } from "@/components/dca/dca-parameters-panel";
import { DCAResultsSummary } from "@/components/dca/dca-results-summary";
import { DCAForecastTable } from "@/components/dca/dca-forecast-table";
import { MonteCarloDialog } from "@/components/dca/dca-monte-carlo-dialog";
import { ModelComparisonTable } from "@/components/dca/model-comparison-table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFluidRateValue } from "@/types/dca";

export default function DCAPage() {
  const params = useParams();
  const wellId = params.wellId as string;
  const queryClient = useQueryClient();

  const { data: prodData, isLoading: prodLoading } = useProduction(wellId, { per_page: 5000 });
  const { data: dcaData } = useDCAAnalyses(wellId);

  const {
    selectedAnalysisId,
    setSelectedAnalysisId,
    selectedFluidType,
    setSelectedFluidType,
    startDate,
    setStartDate,
    autoFitResults,
    autoFitOverlayVisibility,
  } = useDCAStore();

  const productionRecords = useMemo(() => prodData?.data || [], [prodData?.data]);
  const analyses = useMemo(() => dcaData?.data || [], [dcaData?.data]);

  useEffect(() => {
    if (analyses.length === 0) {
      if (selectedAnalysisId) {
        setSelectedAnalysisId(null);
      }
      return;
    }
    const selectedStillExists = selectedAnalysisId
      ? analyses.some((analysis) => analysis.id === selectedAnalysisId)
      : false;
    if (!selectedStillExists) {
      setSelectedAnalysisId(analyses[0].id);
      setSelectedFluidType(analyses[0].fluid_type);
    }
  }, [analyses, selectedAnalysisId, setSelectedAnalysisId, setSelectedFluidType]);

  const currentAnalysis = selectedAnalysisId
    ? (analyses.find((analysis) => analysis.id === selectedAnalysisId) ?? analyses[0] ?? null)
    : (analyses[0] ?? null);

  useEffect(() => {
    if (startDate) {
      return;
    }
    const firstPositive = productionRecords.find((record) => getFluidRateValue(selectedFluidType, record) > 0);
    if (firstPositive) {
      setStartDate(firstPositive.production_date);
    }
  }, [productionRecords, selectedFluidType, setStartDate, startDate]);

  if (prodLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[450px] w-full" />
      </div>
    );
  }

  if (productionRecords.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground">No production data for DCA analysis.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Import production data first from the Import tab.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_280px]">
      {/* Left Panel: Controls */}
      <div className="space-y-3">
        <DCAControls wellId={wellId} />
        <DCADataQualityPanel
          productionData={productionRecords}
          fluidType={selectedFluidType}
          currentStartDate={startDate}
          onApplySuggestedStartDate={(value) => setStartDate(value)}
        />
      </div>

      {/* Center Panel: Chart + Tables */}
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4">
            <DCAChart
              productionData={productionRecords}
              analysis={currentAnalysis}
              autoFitResults={autoFitResults}
              autoFitOverlayVisibility={autoFitOverlayVisibility}
            />
          </CardContent>
        </Card>

        {/* Auto-fit results or forecast table */}
        <Tabs defaultValue="forecast">
          <TabsList>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="comparison">
              Model Comparison
              {autoFitResults.length > 0 && (
                <span className="ml-1.5 rounded bg-primary/20 px-1 py-0.5 text-[10px] font-mono">
                  {autoFitResults.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="forecast">
            {currentAnalysis && currentAnalysis.forecast_points.length > 0 ? (
              <DCAForecastTable
                forecastPoints={currentAnalysis.forecast_points}
                modelType={currentAnalysis.model_type}
                fluidType={currentAnalysis.fluid_type}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Fit a model to see forecast data.
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="comparison">
            {autoFitResults.length > 0 ? (
              <ModelComparisonTable results={autoFitResults} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Run Auto-Fit to compare all 6 decline models.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Panel: Results */}
      <div className="space-y-3">
        {currentAnalysis ? (
          <>
            <DCAResultsSummary analysis={currentAnalysis} />
            <DCAParametersPanel analysis={currentAnalysis} />
            <MonteCarloDialog
              wellId={wellId}
              analysisId={currentAnalysis.id}
              modelType={currentAnalysis.model_type}
              fluidType={currentAnalysis.fluid_type}
              fittedParams={currentAnalysis.parameters}
              onComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["dca", wellId] });
              }}
            />
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Select a model and click Fit to see results.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
