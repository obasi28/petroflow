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

export interface ProjectSummary {
  project_id: string;
  well_count: number;
  dca_count: number;
  total_eur: number;
  total_remaining_reserves: number;
  total_cum_oil: number;
  total_cum_gas: number;
  total_cum_water: number;
  last_production_date: string | null;
}
