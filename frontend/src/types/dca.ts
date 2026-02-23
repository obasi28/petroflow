export type DCAModelType =
  | "exponential"
  | "hyperbolic"
  | "harmonic"
  | "modified_hyperbolic"
  | "sedm"
  | "duong";

export type FluidType = "oil" | "gas" | "water" | "boe";

export type ChartScale = "linear" | "semi-log" | "log-log";

export interface DCAForecastPoint {
  forecast_date: string;
  time_months: number;
  rate: number;
  cumulative: number;
}

export interface DCAAnalysis {
  id: string;
  well_id: string;
  name: string;
  description: string | null;
  model_type: DCAModelType;
  fluid_type: FluidType;
  start_date: string;
  end_date: string | null;
  parameters: Record<string, number>;
  r_squared: number | null;
  rmse: number | null;
  aic: number | null;
  bic: number | null;
  forecast_months: number;
  economic_limit: number | null;
  eur: number | null;
  remaining_reserves: number | null;
  cum_at_forecast_start: number | null;
  monte_carlo_results: MonteCarloResults | null;
  status: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  forecast_points: DCAForecastPoint[];
}

export interface DCACreate {
  name: string;
  description?: string;
  model_type: DCAModelType;
  fluid_type?: FluidType;
  start_date: string;
  end_date?: string;
  initial_params?: Record<string, number>;
  economic_limit?: number;
  forecast_months?: number;
}

export interface DCAAutoFitRequest {
  well_id: string;
  fluid_type?: FluidType;
  start_date: string;
  end_date?: string;
}

export interface DCAAutoFitResult {
  model_type: DCAModelType;
  parameters: Record<string, number>;
  r_squared: number;
  rmse: number;
  aic: number;
  bic: number;
  eur: number | null;
}

export interface DCAMonteCarloRequest {
  iterations?: number;
  param_distributions: Record<string, ParameterDistribution>;
  economic_limit?: number;
}

export interface ParameterDistribution {
  type: "normal" | "lognormal" | "uniform" | "triangular";
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  mode?: number;
}

export interface MonteCarloResults {
  p10: number;
  p50: number;
  p90: number;
  mean: number;
  std: number;
  iterations: number;
  eur_distribution?: number[];
}

export const MODEL_LABELS: Record<DCAModelType, string> = {
  exponential: "Exponential",
  hyperbolic: "Hyperbolic",
  harmonic: "Harmonic",
  modified_hyperbolic: "Modified Hyperbolic",
  sedm: "Stretched Exponential (SEDM)",
  duong: "Duong",
};

export const MODEL_PARAMETERS: Record<DCAModelType, string[]> = {
  exponential: ["qi", "di"],
  hyperbolic: ["qi", "di", "b"],
  harmonic: ["qi", "di"],
  modified_hyperbolic: ["qi", "di", "b", "d_min"],
  sedm: ["qi", "tau", "n"],
  duong: ["qi", "a", "m"],
};

export const PARAMETER_UNITS: Record<string, string> = {
  qi: "bbl/d",
  di: "1/month",
  b: "dimensionless",
  d_min: "1/month",
  tau: "months",
  n: "dimensionless",
  a: "dimensionless",
  m: "dimensionless",
};
