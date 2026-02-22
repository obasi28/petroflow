import { create } from "zustand";
import type { DCAModelType, ChartScale, DCAAnalysis } from "@/types/dca";

interface DCAState {
  selectedModelType: DCAModelType;
  chartScale: ChartScale;
  selectedAnalysis: DCAAnalysis | null;
  showForecast: boolean;
  showMonteCarlo: boolean;
  showComparison: boolean;
  autoFitResults: Array<{
    model_type: DCAModelType;
    parameters: Record<string, number>;
    r_squared: number;
    rmse: number;
    aic: number;
    bic: number;
    eur: number | null;
  }>;

  setSelectedModelType: (type: DCAModelType) => void;
  setChartScale: (scale: ChartScale) => void;
  setSelectedAnalysis: (analysis: DCAAnalysis | null) => void;
  setShowForecast: (show: boolean) => void;
  setShowMonteCarlo: (show: boolean) => void;
  setShowComparison: (show: boolean) => void;
  setAutoFitResults: (results: DCAState["autoFitResults"]) => void;
  reset: () => void;
}

const initialState = {
  selectedModelType: "modified_hyperbolic" as DCAModelType,
  chartScale: "semi-log" as ChartScale,
  selectedAnalysis: null,
  showForecast: true,
  showMonteCarlo: false,
  showComparison: false,
  autoFitResults: [],
};

export const useDCAStore = create<DCAState>((set) => ({
  ...initialState,

  setSelectedModelType: (type) => set({ selectedModelType: type }),
  setChartScale: (scale) => set({ chartScale: scale }),
  setSelectedAnalysis: (analysis) => set({ selectedAnalysis: analysis }),
  setShowForecast: (show) => set({ showForecast: show }),
  setShowMonteCarlo: (show) => set({ showMonteCarlo: show }),
  setShowComparison: (show) => set({ showComparison: show }),
  setAutoFitResults: (results) => set({ autoFitResults: results }),
  reset: () => set(initialState),
}));
