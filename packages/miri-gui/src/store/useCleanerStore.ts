import { create } from "zustand";
import { CleanExecutionResult, CleanTarget, RiskLevel, ScanResult } from "../types";

export type ViewMode = "casual" | "power";
export type TabId = "dashboard" | "storage" | "apps" | "packages" | "tweaks" | "snapshots";

export interface DangerModalConfig {
  isOpen: boolean;
  title: string;
  description: string;
  target?: CleanTarget;
  /** The full set of targets a bulk-clean confirmation covers, for the
   * per-target "what exactly will happen" preview. Single-target/tweak
   * confirmations keep using `target` above; this is additive, not a
   * replacement. */
  targets?: CleanTarget[];
  requiresElevation: boolean;
  riskLevel: RiskLevel;
  onConfirm: () => void;
}

interface CleanerState {
  viewMode: ViewMode;
  activeTab: TabId;
  scanResult: ScanResult | null;
  selectedTargetIds: string[];
  isScanning: boolean;
  isCleaning: boolean;
  dangerModal: DangerModalConfig;
  logDrawerOpen: boolean;
  logs: string[];
  lastCleanResult: CleanExecutionResult | null;

  setViewMode: (mode: ViewMode) => void;
  setActiveTab: (tab: TabId) => void;
  setScanResult: (res: ScanResult | null) => void;
  setIsScanning: (scanning: boolean) => void;
  setIsCleaning: (cleaning: boolean) => void;
  toggleTarget: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setLastCleanResult: (res: CleanExecutionResult | null) => void;
  openDangerModal: (config: Omit<DangerModalConfig, "isOpen">) => void;
  closeDangerModal: () => void;
  toggleLogDrawer: () => void;
  addLog: (line: string) => void;
  clearLogs: () => void;
}

export const useCleanerStore = create<CleanerState>((set) => ({
  viewMode: "casual",
  activeTab: "dashboard",
  scanResult: null,
  selectedTargetIds: [],
  isScanning: false,
  isCleaning: false,
  dangerModal: {
    isOpen: false,
    title: "",
    description: "",
    requiresElevation: false,
    riskLevel: "safe",
    onConfirm: () => {},
  },
  logDrawerOpen: false,
  logs: [
    "System ready. Zero-trust privilege separation initialized.",
    "Non-destructive scanner mounted with symlink guardrails.",
  ],
  lastCleanResult: null,

  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setScanResult: (res) => {
    if (!res) {
      set({ scanResult: null, selectedTargetIds: [] });
      return;
    }
    const defaultIds = res.targets.filter((t) => t.enabled_by_default).map((t) => t.id);
    set({ scanResult: res, selectedTargetIds: defaultIds });
  },
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setIsCleaning: (cleaning) => set({ isCleaning: cleaning }),
  toggleTarget: (id) =>
    set((state) => {
      const exists = state.selectedTargetIds.includes(id);
      const next = exists
        ? state.selectedTargetIds.filter((item) => item !== id)
        : [...state.selectedTargetIds, id];
      return { selectedTargetIds: next };
    }),
  selectAll: () =>
    set((state) => ({
      selectedTargetIds: state.scanResult ? state.scanResult.targets.map((t) => t.id) : [],
    })),
  deselectAll: () => set({ selectedTargetIds: [] }),
  setLastCleanResult: (res) => set({ lastCleanResult: res }),
  openDangerModal: (config) =>
    set({
      dangerModal: {
        ...config,
        isOpen: true,
      },
    }),
  closeDangerModal: () =>
    set((state) => ({
      dangerModal: {
        ...state.dangerModal,
        isOpen: false,
      },
    })),
  toggleLogDrawer: () => set((state) => ({ logDrawerOpen: !state.logDrawerOpen })),
  addLog: (line) =>
    set((state) => ({
      logs: [`[${new Date().toLocaleTimeString()}] ${line}`, ...state.logs.slice(0, 150)],
    })),
  clearLogs: () => set({ logs: [] }),
}));
