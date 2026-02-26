export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectDCAAnalysis {
  id: string;
  well_id: string;
  well_name: string;
  name: string;
  model_type: string;
  fluid_type: string;
  r_squared: number | null;
  aic: number | null;
  eur: number | null;
  remaining_reserves: number | null;
  status: string;
  updated_at: string;
}

export interface ProjectMBAnalysis {
  id: string;
  well_id: string;
  well_name: string;
  name: string;
  method: string;
  ooip: number | null;
  gas_cap_ratio: number | null;
  drive_mechanism: string | null;
  updated_at: string;
}

export interface ProjectWTAnalysis {
  id: string;
  well_id: string;
  well_name: string;
  name: string;
  test_type: string;
  permeability: number | null;
  skin_factor: number | null;
  storage_coefficient: number | null;
  updated_at: string;
}

export interface ProjectListSummary {
  project_id: string;
  well_count: number;
  dca_count: number;
}

export interface ProjectSummary {
  project_id: string;
  well_count: number;
  dca_count: number;
  mb_count: number;
  wt_count: number;
  total_eur: number;
  total_remaining_reserves: number;
  total_cum_oil: number;
  total_cum_gas: number;
  total_cum_water: number;
  last_production_date: string | null;
}

export interface BatchDCARequest {
  model_type: string;
  fluid_type: string;
  forecast_months: number;
  economic_limit: number;
}

export interface BatchDCAResult {
  total_wells: number;
  succeeded: number;
  failed: number;
  analyses: ProjectDCAAnalysis[];
  errors: Array<{ well_id: string; well_name: string; error: string }>;
}
