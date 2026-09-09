import React, { useEffect, useRef, useState } from "react";
import { useCleanerStore } from "./store/useCleanerStore";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { SplashScreen } from "./components/layout/SplashScreen";
import { OnboardingFlow, hasCompletedOnboarding } from "./components/layout/OnboardingFlow";
import { CasualView } from "./components/casual/CasualView";
import { PowerView } from "./components/power/PowerView";
import { AppsView } from "./components/apps/AppsView";
import { StorageView } from "./components/storage/StorageView";
import { PackagesView } from "./components/packages/PackagesView";
import { TweaksView } from "./components/tweaks/TweaksView";
import { SnapshotsView } from "./components/snapshots/SnapshotsView";
import { SettingsView } from "./components/settings/SettingsView";
import { LogDrawer } from "./components/layout/LogDrawer";
import { DangerConfirmationModal } from "./components/layout/DangerConfirmationModal";
import { bridge } from "./lib/bridge";
import { formatBytes } from "./lib/formatters";
import { applyThemeClass } from "./lib/theme";
import { notify } from "./lib/notify";

export const App: React.FC = () => {
  const { viewMode, themeMode, settings, activeTab, setScanResult, setIsScanning, addLog } = useCleanerStore();

  // Keeps "system" mode honest if the OS theme changes while the app is
  // open, and re-applies on every themeMode change (redundant with main.tsx's
  // pre-paint application on first mount, but the only path for later ones).
  useEffect(() => {
    applyThemeClass(themeMode);
    if (themeMode !== "system" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyThemeClass(themeMode);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [themeMode]);

  const [showSplash, setShowSplash] = useState(true);
  // Only ever computed once: reading localStorage on the initial render
  // avoids a flash where onboarding briefly mounts then immediately closes
  // for a returning user.
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());

  // Briefly animate the main stage whenever Casual/Advanced mode changes, so
  // the switch reads as a deliberate transition rather than an abrupt swap.
  const [isModeTransitioning, setIsModeTransitioning] = useState(false);
  const prevViewModeRef = useRef(viewMode);
  useEffect(() => {
    if (prevViewModeRef.current === viewMode) return;
    prevViewModeRef.current = viewMode;
    setIsModeTransitioning(true);
    const timer = setTimeout(() => setIsModeTransitioning(false), 750);
    return () => clearTimeout(timer);
  }, [viewMode]);

  useEffect(() => {
    // Initial silent non-destructive scan
    setIsScanning(true);
    bridge
      .scanAll()
      .then((res) => {
        setScanResult(res);
        addLog(
          `Initial non-destructive inspection ready: ${
            formatBytes(res.total_reclaimable_bytes).formatted
          } discovered across ${res.targets.length} targets.`
        );

        const { total_disk_space, free_disk_space } = res.system_info;
        if (total_disk_space > 0) {
          const freePercent = (free_disk_space / total_disk_space) * 100;
          if (freePercent < settings.lowDiskSpaceThresholdPercent) {
            notify(
              "lowDiskSpace",
              "Low disk space",
              `Only ${formatBytes(free_disk_space).formatted} free (${freePercent.toFixed(1)}% of ${
                formatBytes(total_disk_space).formatted
              }). Open Miri Cleaner to free up space.`
            );
          }
        }
      })
      .catch((err) => {
        addLog(`Scan failed: ${err}`);
      })
      .finally(() => {
        setIsScanning(false);
      });
    // Runs once at startup; re-reading `settings` here would refire the scan
    // whenever a Settings toggle changes, which isn't the point of this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setScanResult, setIsScanning, addLog]);

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      {/* Let the splash's brand moment finish before the first-run
          orientation appears -- never stack two full-screen moments. */}
      {!showSplash && showOnboarding && (
        <OnboardingFlow onDone={() => setShowOnboarding(false)} />
      )}

      <div className="h-screen w-screen flex flex-col bg-miri-bg dark:bg-slate-900 text-slate-800 dark:text-slate-200 overflow-hidden select-none">
        {/* Top Header */}
        <Header />

        {/* Main Workspace Layout */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Navigation Rail */}
          <Sidebar />

          {/* Scrollable Stage */}
          <main
            className={`flex-1 min-h-0 overflow-y-auto p-6 md:p-8 ${
              isModeTransitioning ? "animate-mode-switch" : ""
            }`}
          >
            {activeTab === "dashboard" &&
              (viewMode === "casual" ? <CasualView /> : <PowerView />)}
            {activeTab === "storage" && <StorageView />}
            {activeTab === "apps" && <AppsView />}
            {activeTab === "packages" && <PackagesView />}
            {activeTab === "tweaks" && <TweaksView />}
            {activeTab === "snapshots" && <SnapshotsView />}
            {activeTab === "settings" && <SettingsView />}
          </main>
        </div>

        {/* Slide-out Terminal Log Drawer - Sticky to bottom of application */}
        <LogDrawer />

        {/* Hardened Permission & Dangerous Execution Modal */}
        <DangerConfirmationModal />
      </div>
    </>
  );
};

export default App;
