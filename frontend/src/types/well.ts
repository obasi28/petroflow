export type WellType = "oil" | "gas" | "oil_gas" | "injection";
export type WellStatus = "active" | "shut_in" | "plugged" | "drilling" | "completing";
export type WellOrientation = "vertical" | "horizontal" | "deviated";

export interface Well {
  id: string;
  team_id: string;
  project_id: string | null;
  well_name: string;
  api_number: string | null;
  uwi: string | null;

  // Location
  latitude: number | null;
  longitude: number | null;
  county: string | null;
  state_province: string | null;
  country: string;
  basin: string | null;
  field_name: string | null;

  // Characteristics
  well_type: WellType;
  well_status: WellStatus;
  orientation: WellOrientation;
  formation: string | null;
  operator: string | null;

  // Dates
  spud_date: string | null;
  completion_date: string | null;
  first_prod_date: string | null;

  // Parameters
  total_depth: number | null;
  lateral_length: number | null;
  perf_top: number | null;
  perf_bottom: number | null;
  num_stages: number | null;

  // Reservoir
  initial_pressure: number | null;
  reservoir_temp: number | null;
  porosity: number | null;
  water_saturation: number | null;
  net_pay: number | null;
  permeability: number | null;

  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface WellCreate {
  well_name: string;
  api_number?: string;
  uwi?: string;
  project_id?: string;
  latitude?: number;
  longitude?: number;
  county?: string;
  state_province?: string;
  country?: string;
  basin?: string;
  field_name?: string;
  well_type?: WellType;
  well_status?: WellStatus;
  orientation?: WellOrientation;
  formation?: string;
  operator?: string;
  spud_date?: string;
  completion_date?: string;
  first_prod_date?: string;
  total_depth?: number;
  lateral_length?: number;
  perf_top?: number;
  perf_bottom?: number;
  num_stages?: number;
  initial_pressure?: number;
  reservoir_temp?: number;
  porosity?: number;
  water_saturation?: number;
  net_pay?: number;
  permeability?: number;
  notes?: string;
  tags?: string[];
}

export type WellUpdate = Partial<WellCreate>;

export interface WellFilters {
  page?: number;
  per_page?: number;
  project_id?: string;
  well_status?: WellStatus;
  well_type?: WellType;
  basin?: string;
  search?: string;
}
