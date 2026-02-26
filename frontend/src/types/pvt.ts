export interface PVTCalculateRequest {
  api_gravity: number;
  gas_gravity: number;
  temperature: number;
  separator_pressure?: number;
  separator_temperature?: number;
  rs_at_pb?: number | null;
  max_pressure?: number;
  num_points?: number;
  correlation_bubble_point?: string;
  correlation_rs?: string;
  correlation_bo?: string;
  correlation_dead_oil_viscosity?: string;
}

export interface PVTPoint {
  pressure: number;
  rs: number;
  bo: number;
  bg: number;
  mu_o: number;
  mu_g: number;
  z_factor: number;
  co: number;
  oil_density: number;
}

export interface PVTCalculateResponse {
  bubble_point: number;
  rs_at_pb: number;
  bo_at_pb: number;
  mu_o_at_pb: number;
  inputs: Record<string, number>;
  correlations_used: Record<string, string>;
  table: PVTPoint[];
}

export interface PVTStudy {
  id: string;
  well_id: string;
  team_id: string;
  name: string;
  inputs: Record<string, number>;
  correlation_set: Record<string, string>;
  results: PVTCalculateResponse;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PVTStudyCreate {
  name: string;
  inputs: Record<string, number>;
  correlation_set: Record<string, string>;
  results: PVTCalculateResponse;
}

// Correlation options
export const BUBBLE_POINT_CORRELATIONS = {
  standing: "Standing (1947)",
  vasquez_beggs: "Vasquez-Beggs (1980)",
} as const;

export const RS_CORRELATIONS = {
  standing: "Standing (1947)",
  vasquez_beggs: "Vasquez-Beggs (1980)",
} as const;

export const BO_CORRELATIONS = {
  standing: "Standing (1947)",
  vasquez_beggs: "Vasquez-Beggs (1980)",
} as const;

export const VISCOSITY_CORRELATIONS = {
  beal: "Beal (1946)",
  beggs_robinson: "Beggs-Robinson (1975)",
} as const;
