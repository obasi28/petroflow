import { create } from "zustand";
import type {
  MaterialBalanceCalculateRequest,
  MaterialBalanceCalculateResponse,
} from "@/types/material-balance";

/* ---------- Defaults ---------- */
export const MB_DEFAULT_INPUTS: MaterialBalanceCalculateRequest = {
  initial_pressure: 4000,
  boi: 1.2511,
  bgi: 0.00087,
  rsi: 510,
  method: "havlena_odeh",
  gas_cap_ratio: 0,
  swi: 0.2,
  cf: 0.000003,
  cw: 0.000003,
  pressure_history: [
    { pressure: 3900, np_cum: 500000, gp_cum: 255000, wp_cum: 0, wi_cum: 0, gi_cum: 0 },
    { pressure: 3800, np_cum: 1100000, gp_cum: 522500, wp_cum: 10000, wi_cum: 0, gi_cum: 0 },
    { pressure: 3700, np_cum: 1800000, gp_cum: 810000, wp_cum: 30000, wi_cum: 0, gi_cum: 0 },
    { pressure: 3600, np_cum: 2600000, gp_cum: 1118600, wp_cum: 60000, wi_cum: 0, gi_cum: 0 },
    { pressure: 3500, np_cum: 3500000, gp_cum: 1487500, wp_cum: 100000, wi_cum: 0, gi_cum: 0 },
  ],
  pvt_data: [
    { pressure: 4000, bo: 1.2511, bg: 0.00087, bw: 1.012, rs: 510 },
    { pressure: 3900, bo: 1.2353, bg: 0.00092, bw: 1.012, rs: 477 },
    { pressure: 3800, bo: 1.2222, bg: 0.00096, bw: 1.012, rs: 450 },
    { pressure: 3700, bo: 1.2100, bg: 0.00101, bw: 1.013, rs: 425 },
    { pressure: 3600, bo: 1.1990, bg: 0.00107, bw: 1.013, rs: 401 },
  ],
};

/* ---------- Per-well state slice ---------- */
export interface MBWellState {
  inputs: MaterialBalanceCalculateRequest;
  result: MaterialBalanceCalculateResponse | null;
  chartMode: "f_vs_et" | "campbell";
  analysisName: string;
  autoLoaded: boolean;
}

function defaultWellState(): MBWellState {
  return {
    inputs: { ...MB_DEFAULT_INPUTS, pressure_history: [...MB_DEFAULT_INPUTS.pressure_history], pvt_data: [...MB_DEFAULT_INPUTS.pvt_data] },
    result: null,
    chartMode: "f_vs_et",
    analysisName: "",
    autoLoaded: false,
  };
}

/* ---------- Store interface ---------- */
interface MBStoreState {
  wells: Record<string, MBWellState>;
  getWellState: (wellId: string) => MBWellState;
  setInputs: (wellId: string, inputs: MaterialBalanceCalculateRequest) => void;
  setResult: (wellId: string, result: MaterialBalanceCalculateResponse | null) => void;
  setChartMode: (wellId: string, mode: MBWellState["chartMode"]) => void;
  setAnalysisName: (wellId: string, name: string) => void;
  setAutoLoaded: (wellId: string) => void;
  resetWell: (wellId: string) => void;
}

export const useMBStore = create<MBStoreState>((set, get) => ({
  wells: {},

  getWellState: (wellId: string) => {
    return get().wells[wellId] ?? defaultWellState();
  },

  setInputs: (wellId, inputs) =>
    set((state) => ({
      wells: {
        ...state.wells,
        [wellId]: { ...(state.wells[wellId] ?? defaultWellState()), inputs },
      },
    })),

  setResult: (wellId, result) =>
    set((state) => ({
      wells: {
        ...state.wells,
        [wellId]: { ...(state.wells[wellId] ?? defaultWellState()), result },
      },
    })),

  setChartMode: (wellId, chartMode) =>
    set((state) => ({
      wells: {
        ...state.wells,
        [wellId]: { ...(state.wells[wellId] ?? defaultWellState()), chartMode },
      },
    })),

  setAnalysisName: (wellId, analysisName) =>
    set((state) => ({
      wells: {
        ...state.wells,
        [wellId]: { ...(state.wells[wellId] ?? defaultWellState()), analysisName },
      },
    })),

  setAutoLoaded: (wellId) =>
    set((state) => ({
      wells: {
        ...state.wells,
        [wellId]: {
          ...(state.wells[wellId] ?? defaultWellState()),
          autoLoaded: true,
        },
      },
    })),

  resetWell: (wellId) =>
    set((state) => ({
      wells: {
        ...state.wells,
        [wellId]: defaultWellState(),
      },
    })),
}));
