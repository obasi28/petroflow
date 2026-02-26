export interface PressureStepInput {
  pressure: number;
  np_cum: number;
  gp_cum: number;
  wp_cum: number;
  wi_cum: number;
  gi_cum: number;
}

export interface PVTDataInput {
  pressure: number;
  bo: number;
  bg: number;
  bw: number;
  rs: number;
}

export interface MaterialBalanceCalculateRequest {
  pressure_history: PressureStepInput[];
  pvt_data: PVTDataInput[];
  initial_pressure: number;
  boi: number;
  bgi: number;
  rsi: number;
  method: string; // "schilthuis" | "havlena_odeh" | "both"
  gas_cap_ratio?: number | null;
  swi?: number;
  cf?: number;
  cw?: number;
}

export interface MaterialBalanceCalculateResponse {
  ooip: number | null;
  ogip: number | null;
  gas_cap_ratio: number | null;
  water_influx: number[];
  drive_mechanism: string;
  drive_indices: Record<string, number>;
  plot_data: {
    pressure_vs_production?: {
      pressures: number[];
      np_cum: number[];
    };
    f_vs_et?: {
      F: number[];
      Et: number[];
      regression_line?: {
        x: number[];
        y: number[];
        slope: number;
        intercept: number;
        r_squared: number;
      } | null;
    };
    campbell?: {
      np: number[];
      f_over_et: number[];
    };
    drive_indices?: {
      labels: string[];
      values: number[];
    };
  };
  method: string;
}

export interface MaterialBalanceAnalysis {
  id: string;
  well_id: string;
  team_id: string;
  name: string;
  method: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  ooip: number | null;
  gas_cap_ratio: number | null;
  drive_mechanism: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialBalanceCreate {
  name: string;
  method: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  ooip?: number | null;
  gas_cap_ratio?: number | null;
  drive_mechanism?: string | null;
}

// Method options
export const MB_METHODS = {
  schilthuis: "Schilthuis (1936)",
  havlena_odeh: "Havlena-Odeh (1963)",
  both: "Both Methods",
} as const;
