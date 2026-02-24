import { create } from "zustand";
import type { DCAModelType, ChartScale, DCAAutoFitResult, FluidType } from "@/types/dca";

interface DCAState {
  selectedModelType: DCAModelType;
  selectedFluidType: FluidType;
  chartScale: ChartScale;
  startDate: string;
  endDate: string;
  forecastMonths: number;
  economicLimit: number;
  selectedAnalysisId: string | null;
  showForecast: boolean;
  showMonteCarlo: boolean;
  showComparison: boolean;
  autoFitResults: DCAAutoFitResult[];
  autoFitOverlayVisibility: Partial<Record<DCAModelType, boolean>>;

  setSelectedModelType: (type: DCAModelType) => void;
  setSelectedFluidType: (type: FluidType) => void;
  setChartScale: (scale: ChartScale) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setForecastMonths: (value: number) => void;
  setEconomicLimit: (value: number) => void;
  setSelectedAnalysisId: (analysisId: string | null) => void;
  setShowForecast: (show: boolean) => void;
  setShowMonteCarlo: (show: boolean) => void;
  setShowComparison: (show: boolean) => void;
  setAutoFitResults: (results: DCAState["autoFitResults"]) => void;
  setAutoFitOverlayVisible: (modelType: DCAModelType, isVisible: boolean) => void;
  setAllAutoFitOverlays: (isVisible: boolean) => void;
  reset: () => void;
}

const initialState = {
  selectedModelType: "modified_hyperbolic" as DCAModelType,
  selectedFluidType: "oil" as FluidType,
  chartScale: "semi-log" as ChartScale,
  startDate: "",
  endDate: "",
  forecastMonths: 360,
  economicLimit: 5.0,
  selectedAnalysisId: null,
  showForecast: true,
  showMonteCarlo: false,
  showComparison: false,
  autoFitResults: [] as DCAAutoFitResult[],
  autoFitOverlayVisibility: {} as Partial<Record<DCAModelType, boolean>>,
};

export const useDCAStore = create<DCAState>((set) => ({
  ...initialState,

  setSelectedModelType: (type) => set({ selectedModelType: type }),
  setSelectedFluidType: (type) => set({ selectedFluidType: type }),
  setChartScale: (scale) => set({ chartScale: scale }),
  setStartDate: (value) => set({ startDate: value }),
  setEndDate: (value) => set({ endDate: value }),
  setForecastMonths: (value) => set({ forecastMonths: value }),
  setEconomicLimit: (value) => set({ economicLimit: value }),
  setSelectedAnalysisId: (analysisId) => set({ selectedAnalysisId: analysisId }),
  setShowForecast: (show) => set({ showForecast: show }),
  setShowMonteCarlo: (show) => set({ showMonteCarlo: show }),
  setShowComparison: (show) => set({ showComparison: show }),
  setAutoFitResults: (results) =>
    set(() => {
      const sorted = [...results].sort((a, b) => a.aic - b.aic);
      const defaultVisibleModels = new Set(sorted.slice(0, 3).map((r) => r.model_type));
      const visibilityMap = sorted.reduce((acc, result) => {
        acc[result.model_type] = defaultVisibleModels.has(result.model_type);
        return acc;
      }, {} as Partial<Record<DCAModelType, boolean>>);
      return { autoFitResults: results, autoFitOverlayVisibility: visibilityMap };
    }),
  setAutoFitOverlayVisible: (modelType, isVisible) =>
    set((state) => ({
      autoFitOverlayVisibility: {
        ...state.autoFitOverlayVisibility,
        [modelType]: isVisible,
      },
    })),
  setAllAutoFitOverlays: (isVisible) =>
    set((state) => ({
      autoFitOverlayVisibility: state.autoFitResults.reduce((acc, result) => {
        acc[result.model_type] = isVisible;
        return acc;
      }, {} as Partial<Record<DCAModelType, boolean>>),
    })),
  reset: () => set(initialState),
}));
