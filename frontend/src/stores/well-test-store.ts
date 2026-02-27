import { create } from "zustand";
import type {
  WellTestAnalyzeRequest,
  WellTestAnalyzeResponse,
} from "@/types/well-test";

/* ---------- Synthetic drawdown data for demo ---------- */
function generateSyntheticDrawdown(): { time: number[]; pressure: number[] } {
  const time: number[] = [];
  const pressure: number[] = [];
  const pi = 3500;
  const q = 250;
  const k = 50;
  const h = 50;
  const mu = 0.8;
  const bo = 1.2;
  const phi = 0.15;
  const ct = 1.5e-5;
  const rw = 0.35;
  const s = 2;

  const m = (162.6 * q * mu * bo) / (k * h);
  const logArg = Math.log10(k / (phi * mu * ct * rw * rw)) - 3.23 + 0.87 * s;

  for (let i = 0; i < 50; i++) {
    const t = 0.01 * Math.pow(10, (i / 49) * 4);
    time.push(parseFloat(t.toFixed(4)));
    const pwf = pi - m * (Math.log10(t) + logArg);
    const noise = (Math.random() - 0.5) * 3;
    pressure.push(parseFloat((pwf + noise).toFixed(1)));
  }

  return { time, pressure };
}

const synth = generateSyntheticDrawdown();

/* ---------- Defaults ---------- */
export const WT_DEFAULT_INPUTS: WellTestAnalyzeRequest = {
  time: synth.time,
  pressure: synth.pressure,
  rate: 250,
  test_type: "drawdown",
  tp: null,
  pwf_at_shutin: null,
  well_params: {
    mu: 0.8,
    bo: 1.2,
    h: 50,
    phi: 0.15,
    ct: 1.5e-5,
    rw: 0.35,
    pi: 3500,
  },
};

/* ---------- Per-well state slice ---------- */
export interface WTWellState {
  inputs: WellTestAnalyzeRequest;
  result: WellTestAnalyzeResponse | null;
  chartMode: "log_log" | "semi_log";
  analysisName: string;
  autoLoaded: boolean;
}

function defaultWellState(): WTWellState {
  return {
    inputs: { ...WT_DEFAULT_INPUTS, time: [...WT_DEFAULT_INPUTS.time], pressure: [...WT_DEFAULT_INPUTS.pressure] },
    result: null,
    chartMode: "log_log",
    analysisName: "",
    autoLoaded: false,
  };
}

/* ---------- Store interface ---------- */
interface WTStoreState {
  wells: Record<string, WTWellState>;
  getWellState: (wellId: string) => WTWellState;
  setInputs: (wellId: string, inputs: WellTestAnalyzeRequest) => void;
  setResult: (wellId: string, result: WellTestAnalyzeResponse | null) => void;
  setChartMode: (wellId: string, mode: WTWellState["chartMode"]) => void;
  setAnalysisName: (wellId: string, name: string) => void;
  setAutoLoaded: (wellId: string) => void;
  resetWell: (wellId: string) => void;
}

export const useWTStore = create<WTStoreState>((set, get) => ({
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
