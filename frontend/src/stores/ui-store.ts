import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  theme: "dark" | "light" | "system";
  globalLoading: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: "dark" | "light" | "system") => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  theme: "dark",
  globalLoading: false,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setTheme: (theme) => set({ theme }),
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));
