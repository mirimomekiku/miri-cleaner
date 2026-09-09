import React, { useState } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Mascot } from "../ui/Mascot";
import { TactileButton } from "../ui/TactileButton";
import { PixelBadge } from "../ui/PixelBadge";
import { PixelCheckbox } from "../ui/PixelCheckbox";
import { RiskPill } from "../ui/RiskPill";
import {
  Boxes,
  Package,
  Cpu,
  Sparkles,
  Trash2,
  CheckCircle,
  Laptop,
  ChevronDown,
} from "lucide-react";
import { bridge } from "../../lib/bridge";
import { CardSkeleton } from "../ui/Skeleton";
import { formatBytes } from "../../lib/formatters";
import { ErrorBanner } from "../ui/ErrorBanner";
import { useAsyncAction } from "../../lib/useAsyncAction";
import { ConfettiBurst } from "../ui/ConfettiBurst";
import { celebrationTier } from "../casual/CasualView";
import { StatTile } from "../ui/StatTile";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { HeroCard } from "../ui/HeroCard";

export const PackagesToolchainsView: React.FC = () => {
  const {
    viewMode,
    scanResult,
    setScanResult,
    selectedTargetIds,
    toggleTarget,
    selectAll,
    deselectAll,
    isScanning,
    setIsScanning,
    isCleaning,
    setIsCleaning,
    addLog,
    openDangerModal,
    setLastCleanResult,
  } = useCleanerStore();

  const currentOs =
    scanResult?.system_info.os ||
    (typeof navigator !== "undefined" && navigator.userAgent.includes("Windows")
      ? "windows"
      : "linux");
  const isLinux = currentOs === "linux";
  const isWindows = currentOs === "windows";

  const [dryRun, setDryRun] = useState(false);
  const [successCelebration, setSuccessCelebration] = useState(false);
  const [celebrationFreedBytes, setCelebrationFreedBytes] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"all" | "packages" | "toolchains">("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const errorAction = useAsyncAction();

  // Targets in package_managers and dev_caches categories
  const allMergedTargets =
    scanResult?.targets.filter(
      (t) => t.category === "package_managers" || t.category === "dev_caches"
    ) || [];

  const packageTargets = allMergedTargets.filter((t) => t.category === "package_managers");
  const devTargets = allMergedTargets.filter((t) => t.category === "dev_caches");

  const displayedTargets =
    activeFilter === "all"
      ? allMergedTargets
      : activeFilter === "packages"
      ? packageTargets
      : devTargets;

  const selectedTargets = displayedTargets.filter((t) =>
    selectedTargetIds.includes(t.id)
  );

  const selectedBytes = selectedTargets.reduce((acc, t) => acc + t.estimated_bytes, 0);
  const selectedFormatted = formatBytes(selectedBytes);

  const packageBytes = packageTargets.reduce((acc, t) => acc + t.estimated_bytes, 0);
  const packageFormatted = formatBytes(packageBytes);

  const devBytes = devTargets.reduce((acc, t) => acc + t.estimated_bytes, 0);
  const devFormatted = formatBytes(devBytes);

  const handleScan = async () => {
    setIsScanning(true);
    addLog("Scanning system package managers and developer toolchains...");
    await errorAction.run(
      async () => {
        const res = await bridge.scanAll();
        setScanResult(res);
        addLog("Packages & Toolchains scan completed.");
      },
      {
        formatError: (e) => {
          addLog(`Scan error: ${e}`);
          return `Scan failed: ${e instanceof Error ? e.message : String(e)}`;
        },
      }
    );
    setIsScanning(false);
  };

  const handleCleanSelected = () => {
    if (selectedTargets.length === 0) return;

    const hasDangerous = selectedTargets.some(
      (t) => t.risk_level === "dangerous" || t.risk_level === "aggressive"
    );
    const hasElevation = selectedTargets.some((t) => t.requires_elevation);

    openDangerModal({
      title: "Clean Packages & Toolchains",
      description: `You are about to clean ${selectedTargets.length} selected target(s) (${selectedFormatted.formatted}). Caches will repopulate when packages or compilers run.`,
      requiresElevation: hasElevation,
      riskLevel: hasDangerous ? "dangerous" : "safe",
      onConfirm: async () => {
        setIsCleaning(true);
        addLog(
          `Cleaning selected items: dry_run=${dryRun}, targets=${selectedTargets.map((t) => t.id).join(", ")}`
        );
        await errorAction.run(
          async () => {
            const result = await bridge.executeClean({
              target_ids: selectedTargets.map((t) => t.id),
              dry_run: dryRun,
              create_snapshot: true,
            });
            setLastCleanResult(result);
            addLog(
              `Cleanup finished: ${formatBytes(result.freed_bytes).formatted} freed across ${result.deleted_files} files.`
            );
            setCelebrationFreedBytes(result.freed_bytes);
            setSuccessCelebration(true);
            setTimeout(() => setSuccessCelebration(false), 5000);
            const refreshed = await bridge.scanAll();
            setScanResult(refreshed);
          },
          {
            formatError: (e) => {
              addLog(`Error cleaning targets: ${e}`);
              return `Cleaning targets failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsCleaning(false);
      },
    });
  };

  const handleIndividualPrune = (
    actionKey: string,
    label: string,
    commandName: string,
    requiresElev: boolean = false
  ) => {
    openDangerModal({
      title: `Prune ${label}`,
      description: `Purges cached files for ${label}. Safe for all active projects.`,
      requiresElevation: requiresElev,
      riskLevel: "safe",
      onConfirm: async () => {
        setActionInProgress(actionKey);
        addLog(`Executing: ${label} (${commandName})`);
        await errorAction.run(
          async () => {
            const res = await bridge.executeLinuxTweak(commandName);
            addLog(`Result: ${res}`);
            const refreshed = await bridge.scanAll();
            setScanResult(refreshed);
          },
          {
            formatError: (e) => {
              addLog(`Action error: ${e}`);
              return `Action failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setActionInProgress(null);
      },
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none">
      {errorAction.error && (
        <ErrorBanner message={errorAction.error} onDismiss={errorAction.dismiss} onRetry={errorAction.retry} />
      )}

      {/* ========================================================================= */}
      {/* CASUAL VIEW MODE                                                          */}
      {/* ========================================================================= */}
      {viewMode === "casual" ? (
        <>
          {/* ==================================================================== */}
          {/* ONE HERO MODULE -- lesson-screen grammar: mascot as focal anchor,     */}
          {/* one headline, a consolidated stat strip, and one obvious pill        */}
          {/* primary action (Scan first, then bulk Clean once targets are ready   */}
          {/* and selected). Individual per-tool prune controls collapse behind    */}
          {/* a toggle instead of standing as the page's main structure.           */}
          {/* ==================================================================== */}
          <HeroCard
            accent="miri"
            mascot={
              <>
                <Mascot
                  mood={
                    successCelebration
                      ? "celebrate"
                      : isScanning
                      ? "scanning"
                      : isCleaning
                      ? "cleaning"
                      : "happy"
                  }
                  size="lg"
                />
                {successCelebration && !dryRun && (
                  <ConfettiBurst tier={celebrationTier(celebrationFreedBytes)} />
                )}
              </>
            }
            badgeLabel="Packages & Toolchains"
            badgeVariant="blue"
            badgeSubtitle="DNF5 • Flatpak • WinGet • Python • JS • Podman • C/C++/Rust • JVM • Go"
            heading="Packages & Developer Toolchains"
            description="Safely sweep package repositories, compiler artifact caches, and container layers without touching active projects, configs, or git repositories."
            descriptionMaxWidth="max-w-lg"
          >
            {/* Consolidated stat strip -- package caches, toolchains, and current
                selection, instead of stacking separate metric cards. */}
            <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-3 pt-1">
              <StatTile value={packageFormatted.value} suffix={packageFormatted.unit} label="Package Caches" />
              <StatTile value={devFormatted.value} suffix={devFormatted.unit} label="Toolchains Stored" />
              <StatTile value={selectedFormatted.value} suffix={selectedFormatted.unit} label="Selected to Clean" />
            </div>

            {/* ONE big pill primary action -- Scan first, then Clean once ready */}
            <div className="flex flex-col items-center gap-3 pt-2">
              {!scanResult || allMergedTargets.length === 0 ? (
                <TactileButton
                  variant="primary"
                  size="hero"
                  pill
                  onClick={handleScan}
                  disabled={isScanning}
                  aria-busy={isScanning}
                >
                  <Sparkles className={`w-5 h-5 shrink-0 ${isScanning ? "animate-spin" : ""}`} />
                  {isScanning ? "Scanning..." : "Scan All"}
                </TactileButton>
              ) : (
                <TactileButton
                  variant="primary"
                  size="hero"
                  pill
                  onClick={handleCleanSelected}
                  disabled={isCleaning || selectedTargets.length === 0}
                  aria-busy={isCleaning}
                >
                  <Trash2 className="w-5 h-5 shrink-0" />
                  {isCleaning
                    ? "Cleaning..."
                    : dryRun
                    ? `Simulate Clean (${selectedFormatted.formatted})`
                    : `Clean Selected (${selectedFormatted.formatted})`}
                </TactileButton>
              )}

              {/* Secondary actions -- visually subordinate to the one primary CTA */}
              <div className="flex items-center gap-4 flex-wrap justify-center text-xs font-bold">
                {scanResult && allMergedTargets.length > 0 && (
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={isScanning || isCleaning}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline decoration-dotted underline-offset-4 disabled:opacity-50"
                  >
                    Re-scan
                  </button>
                )}
                <label className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">
                  <PixelCheckbox checked={dryRun} onChange={setDryRun} label="Toggle dry run mode" />
                  Dry-run simulation only
                </label>
              </div>
            </div>
          </HeroCard>

          {isScanning || !scanResult ? (
            <CardSkeleton count={6} />
          ) : (
            <div className="space-y-4">
              {/* Filter tabs -- real functional navigation for the sections below,
                  kept visible rather than tucked (this is primary wayfinding). */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm flex justify-center">
                <SegmentedTabs
                  value={activeFilter}
                  onChange={setActiveFilter}
                  options={[
                    { value: "all", label: `All Items (${allMergedTargets.length})`, icon: <Boxes className="w-4 h-4 text-indigo-500" /> },
                    { value: "packages", label: `System Packages (${packageTargets.length})`, icon: <Package className="w-4 h-4 text-pink-500" /> },
                    { value: "toolchains", label: `Dev Toolchains (${devTargets.length})`, icon: <Cpu className="w-4 h-4 text-emerald-500" /> },
                  ]}
                />
              </div>

              {/* Individual per-tool controls -- secondary to the bulk scan/clean
                  flow above, tucked behind a single expand toggle. */}
              <button
                type="button"
                onClick={() => setDetailsExpanded((v) => !v)}
                aria-expanded={detailsExpanded}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1"
              >
                {detailsExpanded ? "Hide Individual Controls" : "Show Individual Controls"}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${detailsExpanded ? "rotate-180" : ""}`} />
              </button>

              <div className={`collapsible-rows ${detailsExpanded ? "is-expanded" : ""}`}>
                <div className="collapsible-inner">
                  <div className="pt-2 space-y-6">
                    {/* SECTION 1: SYSTEM PACKAGE MANAGERS */}
                    {(activeFilter === "all" || activeFilter === "packages") && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                              System Package Managers
                            </h3>
                          </div>
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                            {packageTargets.length} Stores Available
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* DNF / DNF5 Cache */}
                          <div
                            className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                              !isLinux
                                ? "opacity-50 grayscale-[40%] border-dashed border-slate-300"
                                : "border-slate-100 dark:border-slate-700/60 shadow-duo-sm hover:border-indigo-200"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  Fedora / RPM
                                </span>
                                {isLinux ? (
                                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                    <Laptop className="w-3 h-3" /> Linux Only
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">DNF / DNF5 Cache</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Removes cached RPM metadata, repodata archives, and incomplete package downloads.
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">/var/cache/dnf</span>
                              <TactileButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleIndividualPrune("dnf", "DNF / DNF5 Package Cache", "dnf-cache", true)}
                                disabled={!isLinux || actionInProgress === "dnf"}
                              >
                                {actionInProgress === "dnf" ? "Purging..." : "Prune DNF"}
                              </TactileButton>
                            </div>
                          </div>

                          {/* Flatpak Unused Runtimes */}
                          <div
                            className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                              !isLinux
                                ? "opacity-50 grayscale-[40%] border-dashed border-slate-300"
                                : "border-slate-100 dark:border-slate-700/60 shadow-duo-sm hover:border-indigo-200"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  Flatpak Sandbox
                                </span>
                                {isLinux ? (
                                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                    <Laptop className="w-3 h-3" /> Linux Only
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">Flatpak Unused Runtimes</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Uninstalls orphaned GNOME/KDE runtime layers and sweeps application caches.
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">~/.var/app</span>
                              <TactileButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleIndividualPrune("flatpak", "Flatpak Unused Runtimes", "flatpak", false)}
                                disabled={!isLinux || actionInProgress === "flatpak"}
                              >
                                {actionInProgress === "flatpak" ? "Purging..." : "Prune Flatpak"}
                              </TactileButton>
                            </div>
                          </div>

                          {/* WinGet / AppX Stores */}
                          <div
                            className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                              !isWindows
                                ? "opacity-50 grayscale-[40%] border-dashed border-slate-300"
                                : "border-slate-100 dark:border-slate-700/60 shadow-duo-sm hover:border-indigo-200"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                                  Windows 10/11
                                </span>
                                {isWindows ? (
                                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                    <Laptop className="w-3 h-3" /> Windows Only
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">WinGet Installer Cache</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Clears downloaded installer payloads and cached MSStore package files in %LOCALAPPDATA%.
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">%TEMP%\WinGet</span>
                              <TactileButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleIndividualPrune("winget", "WinGet Cache", "winget-cache", false)}
                                disabled={!isWindows || actionInProgress === "winget"}
                              >
                                {actionInProgress === "winget" ? "Purging..." : "Prune WinGet"}
                              </TactileButton>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION 2: DEVELOPER TOOLCHAINS & RUNTIMES */}
                    {(activeFilter === "all" || activeFilter === "toolchains") && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-emerald-500" />
                            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                              Developer Toolchains & Runtimes
                            </h3>
                          </div>
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                            {devTargets.length} Toolchain Suites
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* 1. Python Ecosystem */}
                          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm hover:border-emerald-200 transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                                  Python Ecosystem
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700">Safe Cache</span>
                              </div>
                              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">pip, uv, Poetry & Conda</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Purges downloaded wheel packages (~/.cache/pip), uv virtualenv archives, Poetry build cache, and conda package tarballs.
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">~/.cache/pip</span>
                              <TactileButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleIndividualPrune("python", "Python Ecosystem Caches", "python-cache", false)}
                                disabled={actionInProgress === "python"}
                              >
                                {actionInProgress === "python" ? "Pruning..." : "Prune Python"}
                              </TactileButton>
                            </div>
                          </div>

                          {/* 2. Modern JS Ecosystem */}
                          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm hover:border-emerald-200 transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200">
                                  Modern JS Ecosystem
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700">Fast Re-fetch</span>
                              </div>
                              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">npm, pnpm, Yarn, Bun & Deno</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Prunes ~/.npm/_cacache, pnpm global store (~/.local/share/pnpm/store), Bun installer tarballs, and Deno HTTP cache.
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">~/.npm/_cacache</span>
                              <TactileButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleIndividualPrune("js", "Modern JS Stores", "pnpm-cache", false)}
                                disabled={actionInProgress === "js"}
                              >
                                {actionInProgress === "js" ? "Pruning..." : "Prune JS Stores"}
                              </TactileButton>
                            </div>
                          </div>

                          {/* 3. Containers & Podman */}
                          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm hover:border-emerald-200 transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200">
                                  Containers & Podman
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700">Storage Prune</span>
                              </div>
                              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">Podman & Docker Runtimes</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Runs podman/docker system prune to free dangling container layers, stopped images, and temporary rootless storage overlays.
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">podman system</span>
                              <TactileButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleIndividualPrune("podman", "Podman & Container Caches", "podman-prune", false)}
                                disabled={actionInProgress === "podman"}
                              >
                                {actionInProgress === "podman" ? "Pruning..." : "Prune Containers"}
                              </TactileButton>
                            </div>
                          </div>

                          {/* 4. C / C++ / Rust Compilers */}
                          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm hover:border-emerald-200 transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-orange-50 text-orange-800 border border-orange-200">
                                  C / C++ / Rust
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700">Rebuilds Fresh</span>
                              </div>
                              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">ccache, sccache, Cargo & Rustup</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Clears compilation object caches (ccache -C / sccache), Rust Cargo crate tarballs, git checkouts, and Rustup temp toolchains.
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">~/.cargo/cache</span>
                              <TactileButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleIndividualPrune("compiler", "C/C++/Rust Compiler Cache", "ccache", false)}
                                disabled={actionInProgress === "compiler"}
                              >
                                {actionInProgress === "compiler" ? "Clearing..." : "Clear Compilers"}
                              </TactileButton>
                            </div>
                          </div>

                          {/* 5. JVM Build Systems */}
                          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm hover:border-emerald-200 transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                                  JVM Ecosystem
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700">Massive Savings</span>
                              </div>
                              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">Maven, Gradle & sbt</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Sweeps downloaded jar dependencies in ~/.m2/repository, Gradle build-cache payloads (~/.gradle/caches), daemons, and Coursier caches.
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">~/.m2/repository</span>
                              <TactileButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleIndividualPrune("jvm", "JVM Maven & Gradle Caches", "jvm-cache", false)}
                                disabled={actionInProgress === "jvm"}
                              >
                                {actionInProgress === "jvm" ? "Cleaning..." : "Clean JVM"}
                              </TactileButton>
                            </div>
                          </div>

                          {/* 6. Go Toolchain */}
                          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm hover:border-emerald-200 transition-all flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200">
                                  Go Toolchain
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700">Quick Clean</span>
                              </div>
                              <h4 className="text-base font-black text-slate-900 dark:text-slate-100">Go Build & Module Cache</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Executes go clean -cache and purges cached module zip packages in ~/go/pkg/mod/cache.
                              </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">go clean -cache</span>
                              <TactileButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleIndividualPrune("go", "Go Module & Build Cache", "go-cache", false)}
                                disabled={actionInProgress === "go"}
                              >
                                {actionInProgress === "go" ? "Cleaning..." : "Clean Go"}
                              </TactileButton>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ========================================================================= */
        /* ADVANCED VIEW MODE                                                        */
        /* ========================================================================= */
        <>
          {/* Advanced Header -- lighter pass only, PowerView-style density */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-7 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <PixelBadge label="Advanced" variant="blue" />
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  Granular Package & Toolchain Cache Inspection
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                Packages & Developer Toolchains
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                <PixelCheckbox
                  checked={dryRun}
                  onChange={setDryRun}
                  label="Toggle dry run mode"
                />
                <span>Dry-Run Mode</span>
              </label>

              <TactileButton
                variant="secondary"
                size="sm"
                onClick={handleScan}
                disabled={isScanning}
              >
                <Sparkles className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
                <span>{isScanning ? "Scanning..." : "Scan All"}</span>
              </TactileButton>

              <TactileButton
                variant="primary"
                size="sm"
                onClick={handleCleanSelected}
                disabled={isCleaning || selectedTargets.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isCleaning
                    ? "Cleaning..."
                    : dryRun
                    ? `Simulate (${selectedFormatted.formatted})`
                    : `Clean (${selectedFormatted.formatted})`}
                </span>
              </TactileButton>
            </div>
          </div>

          {/* Segmented Filter Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm flex justify-center">
            <SegmentedTabs
              value={activeFilter}
              onChange={setActiveFilter}
              options={[
                { value: "all", label: `All Items (${allMergedTargets.length})`, icon: <Boxes className="w-4 h-4 text-indigo-500" /> },
                { value: "packages", label: `System Packages (${packageTargets.length})`, icon: <Package className="w-4 h-4 text-pink-500" /> },
                { value: "toolchains", label: `Dev Toolchains (${devTargets.length})`, icon: <Cpu className="w-4 h-4 text-emerald-500" /> },
              ]}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Select granular targets for dry-run simulation or execution ({displayedTargets.length} items):
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {displayedTargets.map((target) => {
                const isSelected = selectedTargetIds.includes(target.id);
                const targetFormatted = formatBytes(target.estimated_bytes).formatted;
                const isPkg = target.category === "package_managers";

                return (
                  <div
                    key={target.id}
                    className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
                      isSelected ? "border-indigo-400 shadow-duo-sm" : "border-slate-100 dark:border-slate-700/60 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <PixelCheckbox
                        checked={isSelected}
                        onChange={() => toggleTarget(target.id)}
                        label={`Select ${target.name}`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm">{target.name}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                              isPkg
                                ? "bg-pink-50 text-pink-700 border-pink-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {isPkg ? "Package Manager" : "Dev Toolchain"}
                          </span>
                          <RiskPill level={target.risk_level} />
                          {target.requires_elevation && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              Requires Root/UAC
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{target.description}</p>
                        <div className="flex items-center gap-3 text-xs font-mono text-slate-400 dark:text-slate-500 mt-1 flex-wrap">
                          <span>Paths: {target.paths.join(", ")}</span>
                          <span>•</span>
                          <span>Locks: {target.locked_count}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-8 sm:pl-0">
                      <div className="font-pixel text-xs text-slate-800 dark:text-slate-200 font-bold">{targetFormatted}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{target.file_count} files</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default PackagesToolchainsView;
