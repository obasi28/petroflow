import { create } from "zustand";
import type { PVTCalculateRequest, PVTCalculateResponse } from "@/types/pvt";

/* ---------- Defaults ---------- */
export const PVT_DEFAULT_INPUTS: PVTCalculateRequest = {
  api_gravity: 35,
  gas_gravity: 0.75,
  temperature: 200,
  separator_pressure: 100,
  separator_temperature: 60,
  rs_at_pb: 500,
  max_pressure: 6000,
  num_points: 50,
  correlation_bubble_point: "standing",
  correlation_rs: "standing",
  correlation_bo: "standing",
  correlation_dead_oil_viscosity: "beggs_robinson",
};

/* ---------- Per-well state slice ---------- */
export interface PVTWellState {
  inputs: PVTCalculateRequest;
  result: PVTCalculateResponse | null;
  chartMode: "bo_rs" | "viscosity" | "z_factor";
  studyName: string;
  autoLoaded: boolean;
}

function defaultWellState(): PVTWellState {
  return {
    inputs: { ...PVT_DEFAULT_INPUTS },
    result: null,
    chartMode: "bo_rs",
    studyName: "",
    autoLoaded: false,
  };
}

/* ---------- Store interface ---------- */
interface PVTStoreState {
  wells: Record<string, PVTWellState>;
  getWellState: (wellId: string) => PVTWellState;
  setInputs: (wellId: string, inputs: PVTCalculateRequest) => void;
  setResult: (wellId: string, result: PVTCalculateResponse | null) => void;
  setChartMode: (wellId: string, mode: PVTWellState["chartMode"]) => void;
  setStudyName: (wellId: string, name: string) => void;
  setAutoLoaded: (wellId: string) => void;
  resetWell: (wellId: string) => void;
}

export const usePVTStore = create<PVTStoreState>((set, get) => ({
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

  setStudyName: (wellId, studyName) =>
    set((state) => ({
      wells: {
        ...state.wells,
        [wellId]: { ...(state.wells[wellId] ?? defaultWellState()), studyName },
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
