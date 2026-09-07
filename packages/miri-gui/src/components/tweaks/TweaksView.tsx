import React, { useState, useEffect, useMemo } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Mascot } from "../ui/Mascot";
import { TactileButton } from "../ui/TactileButton";
import { PixelBadge } from "../ui/PixelBadge";
import { PixelCheckbox } from "../ui/PixelCheckbox";
import { RiskPill } from "../ui/RiskPill";
import {
  Wrench,
  CheckCircle,
  Play,
  RotateCcw,
  Shield,
  Laptop,
  Terminal,
  Info,
  Sliders,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Search,
  Globe,
  HardDrive,
  Cpu,
  X,
  Copy,
  Check,
  Puzzle,
  ChevronDown,
} from "lucide-react";
import { bridge } from "../../lib/bridge";
import { ListSkeleton, TweaksSkeleton } from "../ui/Skeleton";
import { ErrorBanner } from "../ui/ErrorBanner";
import { useAsyncAction } from "../../lib/useAsyncAction";
import { useCountUp } from "../../lib/useCountUp";
import {
  WindowsUpdateState,
  WindowsTweakItem,
  WindowsVersionInfo,
  LinuxTweakItem,
  DnsInfo,
  TweakActionReport,
  AutostartItem,
} from "../../types";

interface DisplayTweakModal {
  id: string;
  name: string;
  category: string;
  description: string;
  danger_level: "safe" | "moderate" | "dangerous" | "aggressive";
  requiresElevation: boolean;
  is_applied?: boolean;
  is_applicable?: boolean;
  command?: string;
  min_windows_version?: number | null;
}

export const TweaksView: React.FC = () => {
  const { viewMode, scanResult, addLog, openDangerModal } = useCleanerStore();

  const currentOs =
    scanResult?.system_info.os ||
    (typeof navigator !== "undefined" && navigator.userAgent.includes("Windows")
      ? "windows"
      : "linux");
  const isLinux = currentOs === "linux";
  const isWindows = currentOs === "windows";

  const [winUpdateState, setWinUpdateState] = useState<WindowsUpdateState | null>(null);
  const [winVersionInfo, setWinVersionInfo] = useState<WindowsVersionInfo | null>(null);
  const [winTweaks, setWinTweaks] = useState<WindowsTweakItem[]>([]);
  const [linuxTweaks, setLinuxTweaks] = useState<LinuxTweakItem[]>([]);
  const [dnsInfo, setDnsInfo] = useState<DnsInfo | null>(null);
  const [selectedTweakIds, setSelectedTweakIds] = useState<Set<string>>(new Set());
  const [createRestorePoint, setCreateRestorePoint] = useState(true);
  const [selectedDns, setSelectedDns] = useState("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [linuxCategoryFilter, setLinuxCategoryFilter] = useState<"all" | "essential" | "optimization" | "gnome_extension">("all");
  const [activeInfoModal, setActiveInfoModal] = useState<DisplayTweakModal | null>(null);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const errorAction = useAsyncAction();
  const [isLoading, setIsLoading] = useState(true);
  const [autostartItems, setAutostartItems] = useState<AutostartItem[]>([]);
  const [togglingAutostartId, setTogglingAutostartId] = useState<string | null>(null);
  // Casual-mode lesson-screen disclosure state: boot-impact detail and the
  // "more options" bundle (extensions/update profiles/DNS/update shield) are
  // tucked behind these toggles so the hero module stays the one dominant
  // focal point, mirroring CasualView's `gardenExpanded` pattern.
  const [bootExpanded, setBootExpanded] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);

  // Load data on mount
  useEffect(() => {
    setIsLoading(true);
    const p1 = isWindows
      ? Promise.all([
          bridge.getWindowsUpdateState().then(setWinUpdateState).catch(() => {}),
          bridge.getWindowsVersionInfo().then(setWinVersionInfo).catch(() => {}),
          bridge.getWindowsTweaks().then((tweaks) => {
            setWinTweaks(tweaks);
            const defaultSelected = new Set(
              tweaks
                .filter((t) => t.category === "essential" && t.is_applicable && t.id !== "bitlocker")
                .map((t) => t.id)
            );
            setSelectedTweakIds(defaultSelected);
          }).catch(() => {}),
        ])
      : Promise.resolve();

    const p2 = isLinux
      ? bridge.getLinuxTweaks().then((tweaks) => {
          setLinuxTweaks(tweaks);
          const defaultSelected = new Set(
            tweaks
              .filter((t) => t.category === "essential" && !t.is_applied)
              .map((t) => t.id)
          );
          setSelectedTweakIds(defaultSelected);
        }).catch(() => {})
      : Promise.resolve();

    const p3 = bridge.getDnsInfo().then((info) => {
      setDnsInfo(info);
      if (info.current_preset && info.current_preset !== "custom") {
        setSelectedDns(info.current_preset);
      }
    }).catch(() => {});

    const p4 = bridge.getAutostart().then(setAutostartItems).catch(() => {});

    Promise.allSettled([p1, p2, p3, p4]).finally(() => {
      setIsLoading(false);
    });
  }, [isLinux, isWindows]);

  // Illustrative estimates only -- not measured boot telemetry. Meant to
  // give the impact badge a concrete, comparable number rather than just a
  // severity label.
  const BOOT_IMPACT_SECONDS: Record<AutostartItem["impact"], number> = {
    high: 4.0,
    medium: 1.5,
    low: 0.4,
  };
  const enabledAutostartItems = autostartItems.filter((a) => a.enabled);
  const estimatedBootSeconds = enabledAutostartItems.reduce(
    (acc, a) => acc + BOOT_IMPACT_SECONDS[a.impact],
    0
  );
  const animatedBootSeconds = useCountUp(estimatedBootSeconds);

  const handleToggleAutostart = async (item: AutostartItem) => {
    const nextEnabled = !item.enabled;
    setTogglingAutostartId(item.id);
    await errorAction.run(
      async () => {
        const res = await bridge.toggleAutostart(item.file_path, nextEnabled);
        addLog(`[Autostart] ${item.name}: ${res.details}`);
        setAutostartItems((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, enabled: nextEnabled } : a))
        );
      },
      {
        formatError: (e) => {
          addLog(`[Autostart] Error toggling ${item.name}: ${e}`);
          return `Toggling ${item.name} failed: ${e instanceof Error ? e.message : String(e)}`;
        },
      }
    );
    setTogglingAutostartId(null);
  };

  // Windows lists
  const winEssentialTweaks = useMemo(
    () => winTweaks.filter((t) => t.category === "essential"),
    [winTweaks]
  );
  const winAdvancedTweaks = useMemo(
    () => winTweaks.filter((t) => t.category === "advanced_caution"),
    [winTweaks]
  );

  // Linux lists (Fedora)
  const linuxEssentialTweaks = useMemo(
    () => linuxTweaks.filter((t) => t.category === "essential"),
    [linuxTweaks]
  );
  const linuxOptimizations = useMemo(
    () => linuxTweaks.filter((t) => t.category === "optimization"),
    [linuxTweaks]
  );
  const linuxExtensions = useMemo(
    () => linuxTweaks.filter((t) => t.category === "gnome_extension"),
    [linuxTweaks]
  );

  // Filtered lists for active platform
  const filteredWinEssential = useMemo(() => {
    if (!searchQuery.trim()) return winEssentialTweaks;
    const q = searchQuery.toLowerCase();
    return winEssentialTweaks.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [winEssentialTweaks, searchQuery]);

  const filteredWinAdvanced = useMemo(() => {
    if (!searchQuery.trim()) return winAdvancedTweaks;
    const q = searchQuery.toLowerCase();
    return winAdvancedTweaks.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [winAdvancedTweaks, searchQuery]);

  const filteredLinuxEssential = useMemo(() => {
    if (!searchQuery.trim()) return linuxEssentialTweaks;
    const q = searchQuery.toLowerCase();
    return linuxEssentialTweaks.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [linuxEssentialTweaks, searchQuery]);

  const filteredLinuxOptimizations = useMemo(() => {
    if (!searchQuery.trim()) return linuxOptimizations;
    const q = searchQuery.toLowerCase();
    return linuxOptimizations.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [linuxOptimizations, searchQuery]);

  const filteredLinuxExtensions = useMemo(() => {
    if (!searchQuery.trim()) return linuxExtensions;
    const q = searchQuery.toLowerCase();
    return linuxExtensions.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [linuxExtensions, searchQuery]);

  const toggleTweak = (id: string) => {
    setSelectedTweakIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllEssential = () => {
    setSelectedTweakIds((prev) => {
      const next = new Set(prev);
      if (isLinux) {
        linuxEssentialTweaks
          .filter((t) => !t.is_applied)
          .forEach((t) => next.add(t.id));
      } else {
        winEssentialTweaks
          .filter((t) => t.is_applicable && t.id !== "bitlocker")
          .forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedTweakIds(new Set());
  };

  // Check if ShutUp10 is applicable / installed
  const shutupTweak = winTweaks.find((t) => t.id === "shutup10_run");
  const isShutUp10Installed = isWindows && (shutupTweak ? shutupTweak.is_applicable : false);

  // Apply Tweaks Action (Windows or Linux)
  const handleApplyTweaks = async () => {
    const ids = Array.from(selectedTweakIds);
    if (ids.length === 0) return;

    if (isLinux) {
      openDangerModal({
        title: "Apply Selected Fedora Optimizations",
        description: `You are about to apply ${ids.length} system optimizations from the Fedora Post-Install Guide. Elevated privileges will be requested for package and systemd modifications.`,
        requiresElevation: true,
        riskLevel: "safe",
        onConfirm: async () => {
          setIsProcessing(true);
          addLog(`[Fedora Tweaks] Applying ${ids.length} optimizations...`);
          await errorAction.run(
            async () => {
              const reports = await bridge.applyLinuxTweaks(ids);
              reports.forEach((r) => {
                addLog(`[Fedora Tweaks] ${r.name}: ${r.succeeded ? "OK" : "Failed - " + r.details}`);
              });
              // Refresh tweaks list to detect new applied status
              const refreshed = await bridge.getLinuxTweaks();
              setLinuxTweaks(refreshed);
            },
            {
              formatError: (e) => {
                addLog(`[Fedora Tweaks] Error applying optimizations: ${e}`);
                return `Applying Fedora optimizations failed: ${e instanceof Error ? e.message : String(e)}`;
              },
            }
          );
          setIsProcessing(false);
        },
      });
    } else {
      openDangerModal({
        title: "Apply Selected Windows Tweaks",
        description: `You are about to apply ${ids.length} system tweaks. ${
          createRestorePoint ? "A System Restore Point checkpoint will be created first." : ""
        }`,
        requiresElevation: true,
        riskLevel: "moderate",
        onConfirm: async () => {
          setIsProcessing(true);
          addLog(`[Windows Tweaks] Applying ${ids.length} tweaks (Restore Point: ${createRestorePoint})...`);
          await errorAction.run(
            async () => {
              const reports = await bridge.applyWindowsTweaks(ids, createRestorePoint);
              reports.forEach((r) => {
                addLog(`[Windows Tweaks] ${r.name}: ${r.succeeded ? "OK" : "Failed - " + r.details}`);
              });
              const refreshed = await bridge.getWindowsTweaks();
              setWinTweaks(refreshed);
            },
            {
              formatError: (e) => {
                addLog(`[Windows Tweaks] Error applying tweaks: ${e}`);
                return `Applying Windows tweaks failed: ${e instanceof Error ? e.message : String(e)}`;
              },
            }
          );
          setIsProcessing(false);
        },
      });
    }
  };

  // DNS Apply Handler
  const handleApplyDns = async () => {
    openDangerModal({
      title: `Set Active Adapter DNS to ${selectedDns.toUpperCase()}`,
      description: `Configures primary and secondary DNS servers on active network adapters.`,
      requiresElevation: true,
      riskLevel: "safe",
      onConfirm: async () => {
        setIsProcessing(true);
        addLog(`[DNS] Configuring DNS preset: ${selectedDns}...`);
        await errorAction.run(
          async () => {
            const report = await bridge.setDns(selectedDns);
            addLog(`[DNS] ${report.details}`);
            const info = await bridge.getDnsInfo();
            setDnsInfo(info);
          },
          {
            formatError: (e) => {
              addLog(`[DNS] Failed to set DNS: ${e}`);
              return `Setting DNS failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsProcessing(false);
      },
    });
  };

  // Windows Update Profiles handler (Recommended, Default, Disable)
  const handleApplyUpdateProfile = async (profile: "recommended" | "default" | "disable") => {
    const titles = {
      recommended: "Apply Recommended Windows Update Profile",
      default: "Restore Windows Default Updates",
      disable: "Disable Windows Updates",
    };
    const descriptions = {
      recommended: "Defers feature updates for 365 days, quality updates for 4 days, excludes driver updates from Windows Update, and prevents automatic restarts while a user is signed in.",
      default: "Removes update deferral policies, restores update service startup settings to standard, and re-enables scheduled maintenance tasks.",
      disable: "Stops and disables update services (wuauserv, WaaSMedic, UsoSvc, DoSvc), enforces GPO registry override (NoAutoUpdate=1), disables scheduled tasks, and purges downloaded update files.",
    };
    openDangerModal({
      title: titles[profile],
      description: descriptions[profile],
      requiresElevation: true,
      riskLevel: profile === "disable" ? "aggressive" : "safe",
      onConfirm: async () => {
        setIsProcessing(true);
        addLog(`[Windows Updates] Switching profile to: ${profile}...`);
        await errorAction.run(
          async () => {
            await bridge.setWindowsUpdateProfile(profile);
            const st = await bridge.getWindowsUpdateState();
            setWinUpdateState(st);
            addLog(`[Windows Updates] Profile '${profile}' applied successfully.`);
          },
          {
            formatError: (e) => {
              addLog(`[Windows Updates] Error applying profile: ${e}`);
              return `Switching update profile failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsProcessing(false);
      },
    });
  };

  // Windows Update Toggle Handlers (backward compatibility)
  const handleToggleWindowsUpdate = async (disable: boolean) => {
    handleApplyUpdateProfile(disable ? "disable" : "default");
  };

  // Copy command helper
  const handleCopyCommand = (cmd?: string) => {
    if (!cmd) return;
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
    addLog("[Clipboard] Copied tweak command to clipboard.");
  };

  // Count applied essential tweaks for Fedora
  const linuxAppliedEssentialCount = linuxEssentialTweaks.filter((t) => t.is_applied).length;
  const linuxAppliedOptCount = linuxOptimizations.filter((t) => t.is_applied).length;
  const linuxAppliedExtCount = linuxExtensions.filter((t) => t.is_applied).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {errorAction.error && (
        <ErrorBanner message={errorAction.error} onDismiss={errorAction.dismiss} />
      )}

      {/* CASUAL VIEW */}
      {viewMode === "casual" && (
        isLoading ? (
          <TweaksSkeleton />
        ) : (
        <div className="space-y-6">
          {/* ============================================================= */}
          {/* ONE HERO MODULE -- lesson-screen grammar: a single dominant   */}
          {/* focal card, the mascot as emotional anchor, one big pill      */}
          {/* primary action. Essentials-applied / active-DNS / boot-impact */}
          {/* collapse into a slim stat strip instead of stacking as        */}
          {/* separate parallel cards.                                     */}
          {/* ============================================================= */}
          <div className="bg-gradient-to-b from-white to-miri-50/60 rounded-[2rem] p-10 sm:p-12 border-2 border-miri-100 shadow-duo text-center space-y-6">
            <div className="flex justify-center">
              <Mascot mood={errorAction.error ? "alert" : isProcessing ? "cleaning" : "happy"} size="lg" />
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <PixelBadge label={isLinux ? "Fedora Linux" : "Windows 10/11"} variant="pink" />
              <span className="text-xs font-bold text-slate-600">
                {isLinux
                  ? (scanResult?.system_info.os_name || "Fedora Linux 43")
                  : (winVersionInfo?.display_name || "Windows 10/11")}
              </span>
            </div>

            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {isLinux ? "Fedora System Optimizations" : "Windows 10/11 Presets & Tweaks"}
            </h2>
            <p className="text-sm font-semibold text-slate-600 max-w-md mx-auto leading-relaxed">
              {isLinux
                ? "Safe 1-click post-install enhancements: faster DNF, multimedia codecs, Flathub, and boot speedups."
                : "Tune Windows performance, stop telemetry, eliminate search bloat, and protect your privacy."}
            </p>

            {/* Slim consolidated stat strip -- essentials applied, active DNS,
                and boot impact as one lightweight row instead of three parallel cards. */}
            <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-3 pt-1">
              <div className="text-center">
                <div className="text-2xl font-black text-miri-500 font-pixel tabular-nums">
                  {isLinux ? linuxAppliedEssentialCount : winTweaks.filter((t) => t.is_enabled).length}
                  <span className="text-slate-400">/{isLinux ? linuxEssentialTweaks.length : winEssentialTweaks.length}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Essentials Applied</div>
              </div>

              {dnsInfo && (
                <div className="text-center">
                  <div className="text-2xl font-black text-slate-800 truncate max-w-[10rem]">
                    {dnsInfo.display_name}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active DNS</div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setBootExpanded((v) => !v)}
                aria-expanded={bootExpanded}
                className="text-center group"
              >
                <div className="text-2xl font-black text-amber-600 tabular-nums flex items-center gap-1 justify-center">
                  ~{animatedBootSeconds.toFixed(1)}s
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${bootExpanded ? "rotate-180" : ""}`} />
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700">
                  {bootExpanded ? "Hide Boot Impact" : `Boot Impact (${enabledAutostartItems.length} apps)`}
                </div>
              </button>
            </div>

            {/* Boot impact detail tucked behind expansion, per the lesson-screen brief */}
            <div className={`collapsible-rows ${bootExpanded ? "is-expanded" : ""}`}>
              <div className="collapsible-inner">
                <div className="pt-4 text-left space-y-2">
                  <p className="text-xs text-slate-500 max-w-md">
                    Apps that launch automatically when you sign in. Seconds shown are
                    illustrative estimates, not measured boot telemetry.
                  </p>
                  {autostartItems.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                      No startup applications detected.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {autostartItems.map((item) => {
                        const impactStyle =
                          item.impact === "high"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : item.impact === "medium"
                            ? "bg-sky-100 text-sky-800 border-sky-200"
                            : "bg-slate-100 text-slate-600 border-slate-200";
                        return (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <PixelCheckbox
                                checked={item.enabled}
                                onChange={() => handleToggleAutostart(item)}
                                label={`Toggle ${item.name} at startup`}
                                disabled={togglingAutostartId === item.id}
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 text-sm truncate">{item.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono truncate">{item.command}</div>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${impactStyle}`}
                            >
                              +{BOOT_IMPACT_SECONDS[item.impact].toFixed(1)}s
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ONE big pill primary action */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <TactileButton
                variant="primary"
                size="hero"
                pill
                onClick={handleApplyTweaks}
                disabled={isProcessing || selectedTweakIds.size === 0}
                aria-busy={isProcessing}
              >
                <Sparkles className={`w-5 h-5 shrink-0 ${isProcessing ? "animate-spin" : ""}`} />
                {isProcessing ? "Applying..." : `Apply Selected Tweaks (${selectedTweakIds.size})`}
              </TactileButton>

              {/* Secondary actions -- visually subordinate to the one primary CTA */}
              <div className="flex items-center gap-4 flex-wrap justify-center text-xs font-bold">
                <button
                  type="button"
                  onClick={handleSelectAllEssential}
                  className="text-slate-500 hover:text-slate-800 underline decoration-dotted underline-offset-4"
                >
                  Select Essential
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={selectedTweakIds.size === 0}
                  className="text-slate-500 hover:text-slate-800 underline decoration-dotted underline-offset-4 disabled:opacity-50"
                >
                  Clear Selection
                </button>
                {isWindows && (
                  <label className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 cursor-pointer">
                    <PixelCheckbox
                      checked={createRestorePoint}
                      onChange={setCreateRestorePoint}
                      label="Create System Restore Point"
                    />
                    Create Restore Point first
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* PRIMARY CHECKLIST -- essential tweaks status, always visible  */}
          {/* (mirrors the always-shown scan checklist in Casual View).     */}
          {/* ============================================================= */}
          {isLinux ? (
            <div className="card-duo space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-900">Essential Repos &amp; Codecs</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {linuxAppliedEssentialCount} of {linuxEssentialTweaks.length} Applied
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                Applies the 5 core post-install optimizations: enables RPM Fusion (Free &amp; Non-Free), speeds up DNF with parallel downloads &amp; fastest mirror, configures Flathub, and installs full FFmpeg &amp; multimedia codecs.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {linuxEssentialTweaks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="font-bold text-slate-800 truncate pr-2">{t.name}</span>
                    <span
                      className={`shrink-0 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        t.is_applied
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {t.is_applied ? "Applied ✓" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card-duo space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-900">Windows 10/11 Essential Tweaks Preset</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-600" /> Recommended &amp; Safe
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                Applies the 17 essential tweaks: turns off telemetry and timeline tracking,
                disables Bing search results in Start Menu, stops sponsored OEM apps, and speeds up File Explorer.
              </p>
            </div>
          )}

          {/* ============================================================= */}
          {/* MORE OPTIONS -- secondary content tucked behind one toggle:   */}
          {/* extensions/update profiles, DNS switcher, update shield, and  */}
          {/* platform-unavailable notices. Nothing is removed here, only   */}
          {/* deferred behind a disclosure so the hero stays dominant.      */}
          {/* ============================================================= */}
          <div className="px-2">
            <button
              type="button"
              onClick={() => setMoreExpanded((v) => !v)}
              aria-expanded={moreExpanded}
              className="w-full flex items-center justify-between gap-2 text-xs font-black text-slate-500 hover:text-slate-800 py-1"
            >
              <span>{moreExpanded ? "Hide More Options" : "More Options & Advanced Presets"}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${moreExpanded ? "rotate-180" : ""}`} />
            </button>
          </div>

          <div className={`collapsible-rows ${moreExpanded ? "is-expanded" : ""}`}>
            <div className="collapsible-inner">
              <div className="space-y-6 pt-1">
                {isLinux ? (
                  <>
                    {/* GNOME Shell Extensions Suite Card (Casual Mode) */}
                    <div className="card-duo space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-black text-slate-900">
                              GNOME Shell Extensions Suite
                            </h3>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-pink-100 text-pink-800 border border-pink-200 flex items-center gap-1">
                              <Puzzle className="w-3 h-3 text-pink-600" /> Recommended Setup
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {linuxAppliedExtCount} of {linuxExtensions.length} Active
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 max-w-xl">
                            Curated desktop enhancements for Fedora GNOME Shell: AppIndicator system tray icons, Dash to Dock, Blur My Shell frosted glass, Vitals telemetry, Caffeine sleep inhibitor, Pop Shell auto-tiling, Just Perfection, and native Extension Manager.
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <TactileButton
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedTweakIds((prev) => {
                                const next = new Set(prev);
                                linuxExtensions.filter((t) => !t.is_applied).forEach((t) => next.add(t.id));
                                return next;
                              });
                            }}
                          >
                            Select Uninstalled
                          </TactileButton>
                          <TactileButton
                            variant="primary"
                            size="md"
                            onClick={handleApplyTweaks}
                            disabled={isProcessing || !linuxExtensions.some((t) => selectedTweakIds.has(t.id))}
                          >
                            <Sparkles className="w-4 h-4 text-slate-900" />
                            Install Selected Extensions ({linuxExtensions.filter((t) => selectedTweakIds.has(t.id)).length})
                          </TactileButton>
                        </div>
                      </div>

                      {/* Status checklist */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
                        {linuxExtensions.map((t) => {
                          const isChecked = selectedTweakIds.has(t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => toggleTweak(t.id)}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                isChecked
                                  ? "bg-pink-50/70 border-pink-300"
                                  : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <PixelCheckbox
                                  checked={isChecked}
                                  onChange={() => toggleTweak(t.id)}
                                  label={t.name}
                                />
                                <span className="font-bold text-slate-800 truncate text-xs">
                                  {t.name.replace("GNOME Extension - ", "")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span
                                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                    t.is_applied
                                      ? "bg-pink-100 text-pink-800 border border-pink-200"
                                      : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {t.is_applied ? "Active ✓" : "Available"}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Details for ${t.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveInfoModal({
                                      id: t.id,
                                      name: t.name,
                                      category: "GNOME Shell Extension",
                                      description: t.description,
                                      danger_level: t.danger_level,
                                      requiresElevation: t.requires_root,
                                      is_applied: t.is_applied,
                                      is_applicable: t.is_applicable,
                                      command: t.command,
                                    });
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-slate-200 shrink-0"
                                >
                                  <HelpCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Windows Preset Card (Greyed out if running on Fedora) */}
                    <div className="card-duo space-y-3 border-2 border-slate-200/60 bg-slate-50/50 opacity-60 rounded-3xl p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-black text-slate-700">
                              Windows 10/11 Essential Tweaks Preset
                            </h3>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">
                              Windows Only
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                            Essential telemetry, Bing search, and privacy suite. Unavailable because current host is Fedora Linux.
                          </p>
                        </div>
                        <button
                          disabled
                          className="px-3 py-2 rounded-xl text-xs font-black bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shrink-0"
                        >
                          Unavailable on Fedora
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Windows Update Profiles Suite (Matches Screenshot) */
                  <div className="card-duo space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-xl font-black text-slate-900 tracking-tight">
                            Windows Update Profiles
                          </h3>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Windows 10/11
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Choose how Windows receives updates. Each profile replaces the Windows Update settings.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                      {/* Profile 1: Recommended */}
                      <div className={`rounded-2xl p-5 border-2 flex flex-col justify-between transition-all ${
                        winUpdateState?.active_profile === "recommended"
                          ? "border-emerald-500 bg-emerald-50/30 shadow-md ring-2 ring-emerald-500/20"
                          : "border-emerald-200/80 bg-white hover:border-emerald-400"
                      }`}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-black text-slate-900">Recommended</h4>
                            {winUpdateState?.active_profile === "recommended" && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Active ✓
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-600">
                            Balanced security and stability
                          </p>

                          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                            <li>Defers feature updates for 365 days</li>
                            <li>Defers quality updates for 4 days</li>
                            <li>Excludes drivers from quality updates</li>
                            <li>Prevents automatic restarts while a user is signed in</li>
                          </ul>

                          <p className="text-[11px] italic text-slate-500 pt-1">
                            Available on Windows Pro, Enterprise, and Education editions.
                          </p>
                        </div>

                        <div className="pt-4">
                          <TactileButton
                            variant="primary"
                            size="sm"
                            className="w-full justify-center font-black"
                            onClick={() => handleApplyUpdateProfile("recommended")}
                            disabled={isProcessing || !isWindows}
                          >
                            Apply Recommended
                          </TactileButton>
                        </div>
                      </div>

                      {/* Profile 2: Windows Default */}
                      <div className={`rounded-2xl p-5 border-2 flex flex-col justify-between transition-all ${
                        winUpdateState?.active_profile === "default" || (!winUpdateState?.active_profile && !winUpdateState?.fully_disabled)
                          ? "border-indigo-400 bg-indigo-50/30 shadow-md ring-2 ring-indigo-400/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-black text-slate-900">Windows Default</h4>
                            {(winUpdateState?.active_profile === "default" || (!winUpdateState?.active_profile && !winUpdateState?.fully_disabled)) && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                                Active ✓
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-600">
                            Return control to Windows
                          </p>

                          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                            <li>Removes Windows Update policies applied previously</li>
                            <li>Restores update service startup settings</li>
                            <li>Re-enables update scheduled tasks</li>
                          </ul>

                          <p className="text-[11px] italic text-slate-500 pt-1">
                            Use this to undo the Recommended or Disable profile.
                          </p>
                        </div>

                        <div className="pt-4">
                          <TactileButton
                            variant="secondary"
                            size="sm"
                            className="w-full justify-center font-black"
                            onClick={() => handleApplyUpdateProfile("default")}
                            disabled={isProcessing || !isWindows}
                          >
                            Restore Defaults
                          </TactileButton>
                        </div>
                      </div>

                      {/* Profile 3: Disable Updates */}
                      <div className={`rounded-2xl p-5 border-2 flex flex-col justify-between transition-all ${
                        winUpdateState?.active_profile === "disable" || winUpdateState?.fully_disabled
                          ? "border-red-500 bg-red-50/30 shadow-md ring-2 ring-red-500/20"
                          : "border-red-200 bg-white hover:border-red-400"
                      }`}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-black text-red-600">Disable Updates</h4>
                            {(winUpdateState?.active_profile === "disable" || winUpdateState?.fully_disabled) && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                                Active ✓
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-red-500">
                            Advanced use only
                          </p>

                          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                            <li>Disables automatic update policy</li>
                            <li>Stops update services and scheduled tasks</li>
                            <li>Clears downloaded update files</li>
                          </ul>

                          <p className="text-[11px] italic font-semibold text-red-500 pt-1">
                            Security updates will not be installed while this profile is active.
                          </p>
                        </div>

                        <div className="pt-4">
                          <TactileButton
                            variant="danger"
                            size="sm"
                            className="w-full justify-center font-black"
                            onClick={() => handleApplyUpdateProfile("disable")}
                            disabled={isProcessing || !isWindows}
                          >
                            Disable Updates
                          </TactileButton>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Notification Banner */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs font-semibold text-slate-600">
                      Changes apply system-wide. Restart Windows after switching profiles. Use Restore Defaults to undo update policies.
                    </div>
                  </div>
                )}

                {/* Secure DNS Preset Card with Auto-Detection (shared) */}
                <div className="card-duo flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900">Secure DNS Switcher</h4>
                        {dnsInfo && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-indigo-500" />
                            Active: {dnsInfo.display_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Speed up DNS queries and block ads with encrypted, privacy-first DNS resolvers.
                        {dnsInfo?.servers && dnsInfo.servers.length > 0 && ` (${dnsInfo.servers.join(", ")})`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    <select
                      value={selectedDns}
                      onChange={(e) => setSelectedDns(e.target.value)}
                      className="text-xs font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      <option value="default">Default (ISP / DHCP Assigned)</option>
                      <option value="cloudflare">Cloudflare (1.1.1.1 — Fast & Private)</option>
                      <option value="google">Google Public (8.8.8.8)</option>
                      <option value="quad9">Quad9 (9.9.9.9 — Malware Shield)</option>
                      <option value="adguard">AdGuard (Ad-Blocking DNS)</option>
                    </select>

                    <TactileButton
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyDns}
                      disabled={isProcessing}
                    >
                      Apply DNS
                    </TactileButton>
                  </div>
                </div>

                {/* Windows Update Shield (Only shown if Windows) */}
                {isWindows && (
                  <div className="card-duo transition-all space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black text-slate-900">
                            Windows Update Shield (4 Tiers)
                          </h3>
                          {winUpdateState?.fully_disabled ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-red-100 text-red-800 border border-red-200">
                              Updates Disabled
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Default Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-xl">
                          Blocks automatic reboots, forced updates, and telemetry across Services, Scheduled Tasks, Metered Connections, and Group Policy.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <TactileButton
                          variant="danger"
                          size="sm"
                          onClick={() => handleToggleWindowsUpdate(true)}
                          disabled={isProcessing || winUpdateState?.fully_disabled}
                        >
                          Disable Updates
                        </TactileButton>
                        <TactileButton
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleWindowsUpdate(false)}
                          disabled={isProcessing || !winUpdateState?.fully_disabled}
                        >
                          Restore Updates
                        </TactileButton>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )
      )}

      {/* ADVANCED VIEW */}
      {viewMode === "power" && (
        <div className="space-y-6">
          {/* Advanced Mode Action Bar */}
          <div className="bg-white rounded-3xl p-7 border-2 border-slate-100 shadow-duo space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <PixelBadge label="Advanced" variant="blue" />
                  <span className="text-xs font-bold text-slate-400">
                    {isLinux
                      ? "Fedora Post-Install Tweaks & Optimizations"
                      : "Essential & Advanced Tweaks Engine"}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900">
                  {isLinux
                    ? "Fedora Post-Install Tweaks & Optimizations"
                    : "Windows 10/11 Tweaks & Customizations"}
                </h2>
              </div>

              {/* OS Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-xs font-black bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-indigo-500" />
                  <span>
                    {isLinux
                      ? (scanResult?.system_info.os_name || "Fedora Linux 43")
                      : (winVersionInfo?.display_name || "Windows 10/11")}
                  </span>
                </div>
                {dnsInfo && (
                  <div className="text-xs font-black bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5 text-indigo-800 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span>DNS: {dnsInfo.current_preset}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls Row: Search, Presets, and Main Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={isLinux ? "Filter Fedora tweaks..." : "Filter Windows tweaks..."}
                    aria-label={isLinux ? "Filter Fedora tweaks" : "Filter Windows tweaks"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border-2 border-slate-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:border-indigo-400 text-slate-800"
                  />
                </div>

                {isLinux && (
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setLinuxCategoryFilter("all")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        linuxCategoryFilter === "all"
                          ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All ({linuxTweaks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinuxCategoryFilter("essential")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        linuxCategoryFilter === "essential"
                          ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Essential ({linuxEssentialTweaks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinuxCategoryFilter("optimization")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        linuxCategoryFilter === "optimization"
                          ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Performance ({linuxOptimizations.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinuxCategoryFilter("gnome_extension")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        linuxCategoryFilter === "gnome_extension"
                          ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      GNOME Ext ({linuxExtensions.length})
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onClick={handleSelectAllEssential}
                >
                  Select Essential
                </TactileButton>
                <TactileButton
                  variant="secondary"
                  size="sm"
                  onClick={handleClearAll}
                >
                  Clear All
                </TactileButton>
                <TactileButton
                  variant="primary"
                  size="sm"
                  onClick={handleApplyTweaks}
                  disabled={isProcessing || selectedTweakIds.size === 0}
                >
                  <Play className="w-3.5 h-3.5" />
                  Apply Selected ({selectedTweakIds.size})
                </TactileButton>
              </div>
            </div>
          </div>

          {/* DYNAMIC TWO-COLUMN TWEAKS GRID */}
          {isLoading ? (
            <ListSkeleton count={6} />
          ) : isLinux ? (
            /* FEDORA TWEAKS GRID */
            <div className="space-y-6">
              <div className={`grid grid-cols-1 ${
                linuxCategoryFilter === "all" ? "xl:grid-cols-3 md:grid-cols-2" : "grid-cols-1"
              } gap-6 items-start font-pixel-body text-xs`}>
                {/* Column 1: Essential Fedora Tweaks */}
                {(linuxCategoryFilter === "all" || linuxCategoryFilter === "essential") && (
                  <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 font-sans font-black text-base text-slate-900">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span>Essential Repos & Codecs</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">
                        {linuxAppliedEssentialCount} / {linuxEssentialTweaks.length} applied
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                      {filteredLinuxEssential.map((tweak) => {
                        const isChecked = selectedTweakIds.has(tweak.id);

                        return (
                          <div
                            key={tweak.id}
                            onClick={() => toggleTweak(tweak.id)}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl transition-all cursor-pointer select-none border ${
                              isChecked
                                ? "bg-indigo-50/50 border-indigo-200"
                                : "bg-white hover:bg-slate-50 border-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <PixelCheckbox
                                checked={isChecked}
                                onChange={() => toggleTweak(tweak.id)}
                                label={tweak.name}
                              />
                              <span className="truncate text-slate-800 font-medium">
                                {tweak.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                  tweak.is_applied
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {tweak.is_applied ? "Applied ✓" : "Not Applied"}
                              </span>
                              <button
                                type="button"
                                aria-label={`Details for ${tweak.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveInfoModal({
                                    id: tweak.id,
                                    name: tweak.name,
                                    category: "Essential Setup",
                                    description: tweak.description,
                                    danger_level: tweak.danger_level,
                                    requiresElevation: tweak.requires_root,
                                    is_applied: tweak.is_applied,
                                    is_applicable: tweak.is_applicable,
                                    command: tweak.command,
                                  });
                                }}
                                className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-slate-100 shrink-0"
                              >
                                <HelpCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Column 2: System Optimizations & Performance */}
                {(linuxCategoryFilter === "all" || linuxCategoryFilter === "optimization") && (
                  <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 font-sans font-black text-base text-slate-900">
                        <Sliders className="w-4 h-4 text-indigo-500" />
                        <span>System Performance & Tuning</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">
                        {linuxAppliedOptCount} / {linuxOptimizations.length} applied
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                      {filteredLinuxOptimizations.map((tweak) => {
                        const isChecked = selectedTweakIds.has(tweak.id);

                        return (
                          <div
                            key={tweak.id}
                            onClick={() => toggleTweak(tweak.id)}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl transition-all cursor-pointer select-none border ${
                              isChecked
                                ? "bg-indigo-50/50 border-indigo-200"
                                : "bg-white hover:bg-slate-50 border-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <PixelCheckbox
                                checked={isChecked}
                                onChange={() => toggleTweak(tweak.id)}
                                label={tweak.name}
                              />
                              <span className="truncate text-slate-800 font-medium">
                                {tweak.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                  tweak.is_applied
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {tweak.is_applied ? "Applied ✓" : "Not Applied"}
                              </span>
                              <button
                                type="button"
                                aria-label={`Details for ${tweak.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveInfoModal({
                                    id: tweak.id,
                                    name: tweak.name,
                                    category: "System Optimization",
                                    description: tweak.description,
                                    danger_level: tweak.danger_level,
                                    requiresElevation: tweak.requires_root,
                                    is_applied: tweak.is_applied,
                                    is_applicable: tweak.is_applicable,
                                    command: tweak.command,
                                  });
                                }}
                                className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-slate-100 shrink-0"
                              >
                                <HelpCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Column 3: GNOME Shell Extensions Suite */}
                {(linuxCategoryFilter === "all" || linuxCategoryFilter === "gnome_extension") && (
                  <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 font-sans font-black text-base text-slate-900">
                        <Puzzle className="w-4 h-4 text-pink-500" />
                        <span>GNOME Shell Extensions Suite</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">
                        {linuxAppliedExtCount} / {linuxExtensions.length} active
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                      {filteredLinuxExtensions.map((tweak) => {
                        const isChecked = selectedTweakIds.has(tweak.id);

                        return (
                          <div
                            key={tweak.id}
                            onClick={() => toggleTweak(tweak.id)}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl transition-all cursor-pointer select-none border ${
                              isChecked
                                ? "bg-pink-50/50 border-pink-200"
                                : "bg-white hover:bg-slate-50 border-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <PixelCheckbox
                                checked={isChecked}
                                onChange={() => toggleTweak(tweak.id)}
                                label={tweak.name}
                              />
                              <span className="truncate text-slate-800 font-medium">
                                {tweak.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                  tweak.is_applied
                                    ? "bg-pink-100 text-pink-800 border border-pink-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {tweak.is_applied ? "Active ✓" : "Available"}
                              </span>
                              <button
                                type="button"
                                aria-label={`Details for ${tweak.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveInfoModal({
                                    id: tweak.id,
                                    name: tweak.name,
                                    category: "GNOME Extension",
                                    description: tweak.description,
                                    danger_level: tweak.danger_level,
                                    requiresElevation: tweak.requires_root,
                                    is_applied: tweak.is_applied,
                                    is_applicable: tweak.is_applicable,
                                    command: tweak.command,
                                  });
                                }}
                                className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-slate-100 shrink-0"
                              >
                                <HelpCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom DNS Bar for Linux */}
              <div className="bg-white rounded-2xl p-4 border-2 border-slate-100 shadow-duo-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-slate-800 font-bold font-sans">Secure DNS Switcher:</span>
                  <select
                    value={selectedDns}
                    onChange={(e) => setSelectedDns(e.target.value)}
                    className="font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    <option value="default">Default (DHCP / Systemd-Resolved)</option>
                    <option value="cloudflare">Cloudflare (1.1.1.1 - Low Latency)</option>
                    <option value="google">Google (8.8.8.8 - High Reliability)</option>
                    <option value="quad9">Quad9 (9.9.9.9 - Threat Blocking)</option>
                    <option value="adguard">AdGuard (Ad-Blocking & Tracking Protection)</option>
                  </select>
                </div>
                <TactileButton variant="secondary" size="sm" onClick={handleApplyDns}>
                  Apply DNS Setting
                </TactileButton>
              </div>
            </div>
          ) : (
            /* WINDOWS TWEAKS GRID */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start font-pixel-body text-xs">
              {/* Left Column: Essential Tweaks */}
              <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 font-sans font-black text-base text-slate-900">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Essential Windows Tweaks</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    {winEssentialTweaks.length} items
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                  {filteredWinEssential.map((tweak) => {
                    const isChecked = selectedTweakIds.has(tweak.id);
                    const isWin11Only = tweak.min_windows_version === 11;
                    const isUnsupported = !tweak.is_applicable;

                    return (
                      <div
                        key={tweak.id}
                        onClick={() => !isUnsupported && toggleTweak(tweak.id)}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-indigo-50/60 hover:bg-indigo-50"
                            : "hover:bg-slate-50"
                        } ${isUnsupported ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <PixelCheckbox
                            checked={isChecked}
                            onChange={() => !isUnsupported && toggleTweak(tweak.id)}
                            disabled={isUnsupported}
                            label={tweak.name}
                          />
                          <span className="truncate text-slate-800 font-medium">
                            {tweak.name}
                          </span>
                          {isWin11Only && (
                            <span className="shrink-0 text-[10px] font-sans font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Win 11
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          aria-label={`Details for ${tweak.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveInfoModal({
                              id: tweak.id,
                              name: tweak.name,
                              category: "Essential Tweaks",
                              description: tweak.description,
                              danger_level: tweak.danger_level,
                              requiresElevation: tweak.requires_admin,
                              is_applicable: tweak.is_applicable,
                              command: tweak.command,
                              min_windows_version: tweak.min_windows_version,
                            });
                          }}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-slate-100 shrink-0"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Advanced Tweaks */}
              <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 font-sans font-black text-base text-slate-900">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>Advanced Tweaks — CAUTION</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    {winAdvancedTweaks.length} items
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                  {filteredWinAdvanced.map((tweak) => {
                    const isChecked = selectedTweakIds.has(tweak.id);
                    const isWin11Only = tweak.min_windows_version === 11;
                    const isUnsupported = !tweak.is_applicable;

                    return (
                      <div
                        key={tweak.id}
                        onClick={() => !isUnsupported && toggleTweak(tweak.id)}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-amber-50/60 hover:bg-amber-50"
                            : "hover:bg-slate-50"
                        } ${isUnsupported ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <PixelCheckbox
                            checked={isChecked}
                            onChange={() => !isUnsupported && toggleTweak(tweak.id)}
                            disabled={isUnsupported}
                            label={tweak.name}
                          />
                          <span className="truncate text-slate-800 font-medium">
                            {tweak.name}
                          </span>
                          {isWin11Only && (
                            <span className="shrink-0 text-[10px] font-sans font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Win 11
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {tweak.danger_level !== "safe" && (
                            <RiskPill level={tweak.danger_level} />
                          )}
                          <button
                            type="button"
                            aria-label={`Details for ${tweak.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveInfoModal({
                                id: tweak.id,
                                name: tweak.name,
                                category: "Advanced Tweaks",
                                description: tweak.description,
                                danger_level: tweak.danger_level,
                                requiresElevation: tweak.requires_admin,
                                is_applicable: tweak.is_applicable,
                                command: tweak.command,
                                min_windows_version: tweak.min_windows_version,
                              });
                            }}
                            className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-slate-100"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Controls: ShutUp10 & DNS */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
                    <button
                      type="button"
                      disabled={!isShutUp10Installed}
                      title={
                        isShutUp10Installed
                          ? "Run O&O ShutUp10++ companion"
                          : "O&O ShutUp10++ is not installed on this system"
                      }
                      onClick={() => {
                        if (!isShutUp10Installed) return;
                        addLog("[ShutUp10] Attempting to invoke external companion O&O ShutUp10++...");
                        bridge.applyWindowsTweaks(["shutup10_run"], false).then((res) => {
                          addLog(`[ShutUp10] ${res[0]?.details || "Done"}`);
                        });
                      }}
                      className={`text-xs font-black px-3 py-2 rounded-xl border transition-all ${
                        isShutUp10Installed
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                          : "bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      O&O ShutUp10++ - Run
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 font-bold font-sans text-xs">DNS - Set to:</span>
                      <select
                        value={selectedDns}
                        onChange={(e) => setSelectedDns(e.target.value)}
                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 outline-none focus:border-indigo-400"
                      >
                        <option value="default">Default</option>
                        <option value="cloudflare">Cloudflare (1.1.1.1)</option>
                        <option value="google">Google (8.8.8.8)</option>
                        <option value="quad9">Quad9 (9.9.9.9)</option>
                        <option value="adguard">AdGuard (Ad-Blocking)</option>
                      </select>
                      <TactileButton variant="secondary" size="sm" onClick={handleApplyDns}>
                        Set
                      </TactileButton>
                    </div>
                  </div>

                  {/* Windows Update Profiles Row */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Windows Update Profile:</span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {winUpdateState?.active_profile ? `Active: ${winUpdateState.active_profile.toUpperCase()}` : (winUpdateState?.fully_disabled ? "DISABLED" : "DEFAULT")}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <TactileButton
                        variant={winUpdateState?.active_profile === "recommended" ? "primary" : "secondary"}
                        size="sm"
                        className="w-full justify-center text-[11px]"
                        onClick={() => handleApplyUpdateProfile("recommended")}
                        disabled={isProcessing}
                      >
                        Recommended
                      </TactileButton>
                      <TactileButton
                        variant={winUpdateState?.active_profile === "default" || (!winUpdateState?.active_profile && !winUpdateState?.fully_disabled) ? "primary" : "secondary"}
                        size="sm"
                        className="w-full justify-center text-[11px]"
                        onClick={() => handleApplyUpdateProfile("default")}
                        disabled={isProcessing}
                      >
                        Default
                      </TactileButton>
                      <TactileButton
                        variant="danger"
                        size="sm"
                        className="w-full justify-center text-[11px]"
                        onClick={() => handleApplyUpdateProfile("disable")}
                        disabled={isProcessing}
                      >
                        Disable
                      </TactileButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TWEAK INFO & SCRIPT EXECUTION MODAL */}
      {activeInfoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 border-2 border-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-snug">
                    {activeInfoModal.name}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">
                    {activeInfoModal.category}
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close details"
                onClick={() => setActiveInfoModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-sans">
              <div>
                <span className="font-bold text-slate-800">Description:</span>
                <p className="mt-0.5 text-slate-700">{activeInfoModal.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-500 text-[10px] uppercase">Risk Level</div>
                  <div className="mt-1">
                    <RiskPill level={activeInfoModal.danger_level} />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-500 text-[10px] uppercase">Privileges Required</div>
                  <div className="font-black text-slate-800 mt-1">
                    {activeInfoModal.requiresElevation ? "Root / Administrator" : "Standard User"}
                  </div>
                </div>
              </div>

              {activeInfoModal.min_windows_version && (
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-indigo-900">
                  <span className="font-bold">OS Requirement:</span> Windows {activeInfoModal.min_windows_version} or higher.
                </div>
              )}

              {/* Exact Script / Command Executed Display */}
              {activeInfoModal.command && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                      Command / Script Executed:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCommand(activeInfoModal.command)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 flex items-center gap-1 transition-colors"
                    >
                      {copiedCommand ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Command</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl font-mono text-[11px] overflow-x-auto border border-slate-800 shadow-inner whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto select-all">
                    {activeInfoModal.command}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <TactileButton
                variant="secondary"
                size="sm"
                onClick={() => setActiveInfoModal(null)}
              >
                Close
              </TactileButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
