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
  FolderOpen,
  Lock,
  Play,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
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
  const [safetyExpanded, setSafetyExpanded] = useState(false);
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
          {/* ==================================================================== */}
          {/* ONE HERO MODULE -- lesson-screen grammar: mascot as focal anchor,     */}
          {/* one headline, a consolidated stat strip, and one obvious pill        */}
          {/* primary action. Safety rationale collapses behind a toggle instead   */}
          {/* of three parallel same-size explainer cards.                        */}
          {/* ==================================================================== */}
          <div className="bg-gradient-to-b from-white to-miri-50/60 rounded-[2rem] p-10 sm:p-12 border-2 border-miri-100 shadow-duo text-center space-y-6">
            <div className="flex justify-center">
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
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <PixelBadge label="Dev Toolchains" variant="green" />
              <span className="text-xs font-bold text-slate-500">
                Cargo • Node/pnpm • Docker/Podman • Python • Go • ccache
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Developer Ecosystem Caches
            </h2>
            <p className="text-sm font-semibold text-slate-600 max-w-md mx-auto leading-relaxed">
              Clean accumulated build artifacts, package registries, and container
              layers safely without touching your source code or git trees.
            </p>

            {/* Consolidated stat strip -- caches stored, selected, and a toggle
                for the safety rationale, instead of stacking separate cards. */}
            <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-3 pt-1">
              <div className="text-center">
                <div className="text-2xl font-black text-slate-800 tabular-nums">
                  {totalDevFormatted.value}
                  <span className="text-xs font-bold text-slate-500 ml-0.5">{totalDevFormatted.unit}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Caches Stored</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-slate-800 tabular-nums">
                  {selectedFormatted.value}
                  <span className="text-xs font-bold text-slate-500 ml-0.5">{selectedFormatted.unit}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selected to Clean</div>
              </div>
              <button
                type="button"
                onClick={() => setSafetyExpanded((v) => !v)}
                aria-expanded={safetyExpanded}
                className="text-center group"
              >
                <div className="text-2xl font-black text-emerald-600 flex items-center gap-1 justify-center">
                  <ShieldCheck className="w-5 h-5" />
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${safetyExpanded ? "rotate-180" : ""}`} />
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700">
                  {safetyExpanded ? "Hide Safety Info" : "Why It's Safe"}
                </div>
              </button>
            </div>

            {/* Secondary safety rationale tucked behind expansion */}
            <div className={`collapsible-rows ${safetyExpanded ? "is-expanded" : ""}`}>
              <div className="collapsible-inner">
                <div className="pt-4 text-left space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>
                      <span className="font-black text-slate-800">Source Code Protected. </span>
                      Only global artifact stores and build cache directories are cleaned.
                      Your git repositories and local code remain completely untouched.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>
                      <span className="font-black text-slate-800">Auto-Regenerated. </span>
                      Compilers (cargo, npm, go) automatically download and rebuild caches
                      the next time you compile your projects.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                    <Cpu className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>
                      <span className="font-black text-slate-800">Free Tens of Gigabytes. </span>
                      Dangling Docker layers and untracked npm caches can easily devour
                      20-50 GB of disk over months of coding.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ONE big pill primary action -- Scan first, then Clean once ready */}
            <div className="flex flex-col items-center gap-3 pt-2">
              {!scanResult || devTargets.length === 0 ? (
                <TactileButton
                  variant="primary"
                  size="hero"
                  pill
                  onClick={handleScan}
                  disabled={isScanning}
                  aria-busy={isScanning}
                >
                  <Sparkles className={`w-5 h-5 shrink-0 ${isScanning ? "animate-spin" : ""}`} />
                  {isScanning ? "Scanning..." : "Scan Toolchains"}
                </TactileButton>
              ) : (
                <TactileButton
                  variant="primary"
                  size="hero"
                  pill
                  onClick={handleClean}
                  disabled={isCleaning || selectedDevTargets.length === 0}
                  aria-busy={isCleaning}
                >
                  <Trash2 className="w-5 h-5 shrink-0" />
                  {isCleaning
                    ? "Cleaning Safely..."
                    : dryRun
                    ? `Simulate Clean (${selectedFormatted.formatted})`
                    : `Clean Dev Caches (${selectedFormatted.formatted})`}
                </TactileButton>
              )}

              {/* Secondary actions -- visually subordinate to the one primary CTA */}
              <div className="flex items-center gap-4 flex-wrap justify-center text-xs font-bold">
                {scanResult && devTargets.length > 0 && (
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={isScanning || isCleaning}
                    className="text-slate-500 hover:text-slate-800 underline decoration-dotted underline-offset-4 disabled:opacity-50"
                  >
                    Re-scan
                  </button>
                )}
                <label className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 cursor-pointer">
                  <PixelCheckbox
                    checked={dryRun}
                    onChange={setDryRun}
                    label="Toggle dry run simulation"
                  />
                  Dry-run simulation only
                </label>
              </div>
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
                    className={`bg-white rounded-2xl p-4 border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
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
                        <div className="flex items-center gap-2 flex-wrap">
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

                    <div className="text-right shrink-0 pl-8 sm:pl-0">
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
