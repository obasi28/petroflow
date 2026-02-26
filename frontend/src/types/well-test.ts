export interface WellParamsInput {
  mu: number;
  bo: number;
  h: number;
  phi: number;
  ct: number;
  rw: number;
  pi?: number | null;
}

export interface WellTestAnalyzeRequest {
  time: number[];
  pressure: number[];
  rate: number;
  test_type: "drawdown" | "buildup";
  tp?: number | null;
  pwf_at_shutin?: number | null;
  well_params: WellParamsInput;
}

export interface WellTestAnalyzeResponse {
  test_type: string;
  permeability: number;
  skin_factor: number;
  flow_capacity: number;
  p_star: number | null;
  flow_efficiency: number | null;
  dp_skin: number | null;
  radius_investigation: number | null;
  summary: {
    test_type: string;
    permeability_md: number;
    perm_class: string;
    skin_factor: number;
    skin_description: string;
    flow_capacity_mdft: number;
    slope_psi_cycle: number;
    iarf_detected: boolean;
    flow_regimes: string[];
    dp_skin_psi?: number;
    p_star_psi?: number;
    flow_efficiency?: number;
    fe_percent?: number;
    radius_investigation_ft?: number;
  };
  plot_data: {
    semi_log?: {
      log_t: number[];
      pwf: number[];
      fit_line: number[];
    };
    horner?: {
      log_htr: number[];
      pws: number[];
      fit_line: number[];
    };
    mdh?: {
      log_dt: number[];
      pws: number[];
      fit_line: number[];
    };
    log_log?: {
      log_t: number[];
      log_dp: number[];
      log_deriv: number[];
    };
    derivative?: {
      time: number[];
      delta_p: number[];
      derivative: number[];
      flow_regimes: Array<{
        name: string;
        start_idx: number;
        end_idx: number;
        slope: number;
      }>;
    };
  };
}

export interface WellTestAnalysis {
  id: string;
  well_id: string;
  team_id: string;
  name: string;
  test_type: string;
  test_data: Record<string, unknown>;
  results: Record<string, unknown>;
  permeability: number | null;
  skin_factor: number | null;
  storage_coefficient: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WellTestCreate {
  name: string;
  test_type: string;
  test_data: Record<string, unknown>;
  results: Record<string, unknown>;
  permeability?: number | null;
  skin_factor?: number | null;
  storage_coefficient?: number | null;
}
