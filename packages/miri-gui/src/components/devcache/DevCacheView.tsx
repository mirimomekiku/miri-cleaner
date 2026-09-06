import React, { useState } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Mascot } from "../ui/Mascot";
import { TactileButton } from "../ui/TactileButton";
import { PixelBadge } from "../ui/PixelBadge";
import { PixelCheckbox } from "../ui/PixelCheckbox";
import { RiskPill } from "../ui/RiskPill";
import {
  Cpu,
  Sparkles,
  Trash2,
  Info,
  FolderOpen,
  Lock,
  Play,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { bridge } from "../../lib/bridge";
import { formatBytes } from "../../lib/formatters";
import { ErrorBanner } from "../ui/ErrorBanner";
import { useAsyncAction } from "../../lib/useAsyncAction";

export const DevCacheView: React.FC = () => {
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

  const [dryRun, setDryRun] = useState(false);
  const [successCelebration, setSuccessCelebration] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const errorAction = useAsyncAction();

  // Targets in dev_caches category
  const devTargets =
    scanResult?.targets.filter((t) => t.category === "dev_caches") || [];

  const selectedDevTargets = devTargets.filter((t) =>
    selectedTargetIds.includes(t.id)
  );
  const selectedBytes = selectedDevTargets.reduce(
    (acc, t) => acc + t.estimated_bytes,
    0
  );
  const selectedFormatted = formatBytes(selectedBytes);
  const totalDevBytes = devTargets.reduce(
    (acc, t) => acc + t.estimated_bytes,
    0
  );
  const totalDevFormatted = formatBytes(totalDevBytes);

  const handleScan = async () => {
    setIsScanning(true);
    addLog("Scanning developer toolchain caches (Cargo, Node/pnpm, Docker/Podman, Python, Go, ccache)...");
    await errorAction.run(
      async () => {
        const res = await bridge.scanAll();
        setScanResult(res);
        addLog("Developer toolchain scan completed.");
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

  const handleClean = () => {
    if (selectedDevTargets.length === 0) return;

    openDangerModal({
      title: "Clean Developer Toolchain Caches",
      description: `You are about to prune ${selectedDevTargets.length} developer caches (${selectedFormatted.formatted}). Caches will repopulate on your next build.`,
      requiresElevation: selectedDevTargets.some((t) => t.requires_elevation),
      riskLevel: "safe",
      onConfirm: async () => {
        setIsCleaning(true);
        addLog(`Pruning developer caches: targets=${selectedDevTargets.map((t) => t.id).join(", ")}`);
        await errorAction.run(
          async () => {
            const result = await bridge.executeClean({
              target_ids: selectedDevTargets.map((t) => t.id),
              dry_run: dryRun,
              create_snapshot: true,
            });
            setLastCleanResult(result);
            addLog(
              `Developer caches pruned: ${formatBytes(result.freed_bytes).formatted} freed.`
            );
            setSuccessCelebration(true);
            setTimeout(() => setSuccessCelebration(false), 5000);
            const refreshed = await bridge.scanAll();
            setScanResult(refreshed);
          },
          {
            formatError: (e) => {
              addLog(`Error cleaning dev caches: ${e}`);
              return `Cleaning developer caches failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsCleaning(false);
      },
    });
  };

  const handleIndividualPrune = async (tweakName: string, label: string) => {
    openDangerModal({
      title: `Prune ${label}`,
      description: `Cleans ${label} stores. Verified safe for all projects.`,
      requiresElevation: false,
      riskLevel: "safe",
      onConfirm: async () => {
        setIsProcessing(true);
        addLog(`Running prune action: ${tweakName}`);
        await errorAction.run(
          async () => {
            const res = await bridge.executeLinuxTweak(tweakName);
            addLog(`Result: ${res}`);
            const refreshed = await bridge.scanAll();
            setScanResult(refreshed);
          },
          {
            formatError: (e) => {
              addLog(`Prune error: ${e}`);
              return `Prune action failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsProcessing(false);
      },
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none">
      {errorAction.error && (
        <ErrorBanner message={errorAction.error} onDismiss={errorAction.dismiss} onRetry={errorAction.retry} />
      )}
      {/* ========================================================================= */}
      {/* CASUAL VIEW MODE */}
      {/* ========================================================================= */}
      {viewMode === "casual" ? (
        <>
          {/* Top Header */}
          <div className="bg-gradient-to-br from-white to-emerald-50/40 rounded-3xl p-8 border-2 border-emerald-100 shadow-duo flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 w-full md:w-auto min-w-0">
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
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PixelBadge label="Dev Toolchains" variant="green" />
                  <span className="text-xs font-bold text-slate-400">
                    Cargo • Node/pnpm • Docker/Podman • Python • Go • ccache
                  </span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  Developer Ecosystem Caches
                </h2>
                <p className="text-sm font-semibold text-slate-500 mt-1 max-w-md">
                  Clean accumulated build artifacts, package registries, and container
                  layers safely without touching your source code or git trees.
                </p>
              </div>
            </div>

            {/* Total Reclaimable Pill */}
            <div className="bg-white rounded-2xl p-4 border-2 border-slate-100 shadow-duo-sm text-center min-w-[140px]">
              <div className="text-3xl font-black text-slate-800">
                {totalDevFormatted.value}{" "}
                <span className="text-sm font-bold text-slate-400">{totalDevFormatted.unit}</span>
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Caches Stored
              </div>
            </div>
          </div>

          {/* Friendly Explanation Card */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo-sm space-y-3">
            <div className="flex items-center gap-2.5 text-slate-800 font-extrabold text-sm">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>Safe for active development</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="font-black text-slate-800 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Source Code Protected
                </div>
                <p>
                  Only global artifact stores and build cache directories are cleaned.
                  Your git repositories and local code remain completely untouched.
                </p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="font-black text-slate-800 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Auto-Regenerated
                </div>
                <p>
                  Compilers (cargo, npm, go) automatically download and rebuild caches
                  the next time you compile your projects.
                </p>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="font-black text-slate-800 mb-1 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                  Free Tens of Gigabytes
                </div>
                <p>
                  Dangling Docker layers and untracked npm caches can easily devour
                  20-50 GB of disk over months of coding.
                </p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <PixelCheckbox
                  checked={dryRun}
                  onChange={setDryRun}
                  label="Toggle dry run simulation"
                />
                <span>Dry-Run Mode (Simulation only, no file deletion)</span>
              </label>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <TactileButton
                variant="secondary"
                onClick={handleScan}
                disabled={isScanning}
                className="flex-1 sm:flex-none"
              >
                <Sparkles className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
                {isScanning ? "Scanning..." : "Scan Toolchains"}
              </TactileButton>

              <TactileButton
                variant="primary"
                onClick={handleClean}
                disabled={isCleaning || selectedDevTargets.length === 0}
                size="lg"
                className="flex-1 sm:flex-none"
              >
                <Trash2 className="w-5 h-5" />
                {isCleaning
                  ? "Cleaning Safely..."
                  : dryRun
                  ? `Simulate Clean (${selectedFormatted.formatted})`
                  : `Clean Dev Caches (${selectedFormatted.formatted})`}
              </TactileButton>
            </div>
          </div>

          {/* Curated Checkboxes Grid */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-500 px-1">
              Select developer caches to clean:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devTargets.map((target) => {
                const isSelected = selectedTargetIds.includes(target.id);
                const targetFormatted = formatBytes(target.estimated_bytes).formatted;

                return (
                  <div
                    key={target.id}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => toggleTarget(target.id)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleTarget(target.id);
                      }
                    }}
                    className={`card-duo cursor-pointer flex items-center justify-between gap-4 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-miri-400/60 ${
                      isSelected
                        ? "border-miri-400 bg-miri-50/40 shadow-duo"
                        : "hover:border-slate-300 opacity-85"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <PixelCheckbox
                        checked={isSelected}
                        onChange={() => toggleTarget(target.id)}
                        label={`Select ${target.name}`}
                      />
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all ${
                          isSelected
                            ? "bg-emerald-500 text-white border-emerald-600 shadow-duo-sm"
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        }`}
                      >
                        <Cpu className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-800 text-sm md:text-base truncate">
                          {target.name}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {target.description}
                        </p>
                        <div className="text-xs font-bold text-slate-400 mt-0.5">
                          {target.file_count.toLocaleString()} files inspected
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-pixel text-xs text-slate-800 font-bold">
                        {targetFormatted}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* ========================================================================= */
        /* ADVANCED VIEW MODE */
        /* ========================================================================= */
        <>
          {/* Advanced Header */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <PixelBadge label="Advanced" variant="blue" />
                <span className="text-xs font-bold text-slate-400">
                  Granular Toolchain Pruning & Cache Directory Inspection
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                Developer Toolchain & Container Caches
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <TactileButton
                variant="primary"
                onClick={handleClean}
                disabled={isCleaning || selectedDevTargets.length === 0}
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
                Execute Clean ({selectedFormatted.formatted})
              </TactileButton>
            </div>
          </div>

          {/* Granular Inspection List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-500">
                Detailed cache directories and process lock inspection:
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {devTargets.map((target) => {
                const isSelected = selectedTargetIds.includes(target.id);
                const targetFormatted = formatBytes(target.estimated_bytes).formatted;

                return (
                  <div
                    key={target.id}
                    className={`bg-white rounded-2xl p-4 border-2 transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? "border-miri-400 shadow-duo-sm"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <PixelCheckbox
                        checked={isSelected}
                        onChange={() => toggleTarget(target.id)}
                        label={`Select ${target.name}`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-800 text-sm">
                            {target.name}
                          </h4>
                          <RiskPill level={target.risk_level} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{target.description}</p>
                        <div className="flex items-center gap-4 text-xs font-mono text-slate-400 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <FolderOpen className="w-3.5 h-3.5" />
                            {target.paths.join(", ")}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" />
                            Locks: {target.locked_count}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-pixel text-xs text-slate-800 font-bold">
                        {targetFormatted}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {target.file_count} files
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Granular Individual Prune Controls */}
          <div className="card-duo space-y-4">
            <h3 className="text-lg font-black text-slate-900">Direct Toolchain Pruning Commands</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 text-sm">Docker Dangling Images</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">docker image prune -f</div>
                </div>
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleIndividualPrune("docker-prune", "Docker Dangling Images")}
                  disabled={isProcessing}
                >
                  <Play className="w-3.5 h-3.5" />
                  Prune
                </TactileButton>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 text-sm">Podman Prune</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">podman system prune -f</div>
                </div>
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleIndividualPrune("podman-prune", "Podman Cache & Images")}
                  disabled={isProcessing}
                >
                  <Play className="w-3.5 h-3.5" />
                  Prune
                </TactileButton>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 text-sm">Cargo Registry Cache</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">cargo-cache --autoclean</div>
                </div>
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleIndividualPrune("cargo-cache", "Cargo Cache")}
                  disabled={isProcessing}
                >
                  <Play className="w-3.5 h-3.5" />
                  Prune
                </TactileButton>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 text-sm">Python (pip & uv)</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">pip cache purge / uv clean</div>
                </div>
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleIndividualPrune("python-cache", "Python Wheel & UV Cache")}
                  disabled={isProcessing}
                >
                  <Play className="w-3.5 h-3.5" />
                  Prune
                </TactileButton>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 text-sm">Node.js npm Cache</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">npm cache clean --force</div>
                </div>
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleIndividualPrune("npm-cache", "Node npm Cache")}
                  disabled={isProcessing}
                >
                  <Play className="w-3.5 h-3.5" />
                  Prune
                </TactileButton>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 text-sm">pnpm / Yarn / Bun Store</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">pnpm store prune</div>
                </div>
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleIndividualPrune("pnpm-cache", "pnpm / Yarn / Bun Cache")}
                  disabled={isProcessing}
                >
                  <Play className="w-3.5 h-3.5" />
                  Prune
                </TactileButton>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 text-sm">Go Toolchain Cache</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">go clean -cache</div>
                </div>
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleIndividualPrune("go-cache", "Go Build Cache")}
                  disabled={isProcessing}
                >
                  <Play className="w-3.5 h-3.5" />
                  Prune
                </TactileButton>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800 text-sm">C/C++ Compiler Cache</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">ccache -C / sccache</div>
                </div>
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleIndividualPrune("ccache", "ccache / sccache Compiler Cache")}
                  disabled={isProcessing}
                >
                  <Play className="w-3.5 h-3.5" />
                  Prune
                </TactileButton>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
