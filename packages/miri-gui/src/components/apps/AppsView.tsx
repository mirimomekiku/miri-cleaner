import React, { useState, useEffect, useMemo } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Mascot } from "../ui/Mascot";
import { TactileButton } from "../ui/TactileButton";
import { PixelBadge } from "../ui/PixelBadge";
import { PixelCheckbox } from "../ui/PixelCheckbox";
import {
  Download,
  CheckCircle,
  Package,
  Search,
  Code2,
  Gamepad2,
  Globe,
  MessageSquare,
  Video,
  Wrench,
  Lock,
  Plus,
  Check,
  Trash2,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { bridge } from "../../lib/bridge";
import { AppDefinition, AppLeftover, InstalledAppUsage } from "../../types";
import { AppCatalogSkeleton, CardSkeleton } from "../ui/Skeleton";
import { formatBytes } from "../../lib/formatters";
import { ErrorBanner } from "../ui/ErrorBanner";
import { useAsyncAction } from "../../lib/useAsyncAction";
import { notify } from "../../lib/notify";

export const AppsView: React.FC = () => {
  const { viewMode, scanResult, addLog, openDangerModal, settings } = useCleanerStore();

  const currentOs =
    scanResult?.system_info.os ||
    (typeof navigator !== "undefined" && navigator.userAgent.includes("Windows")
      ? "windows"
      : "linux");
  const isLinux = currentOs === "linux";
  const isWindows = currentOs === "windows";

  const [apps, setApps] = useState<AppDefinition[]>([]);
  const [installedAppUsage, setInstalledAppUsage] = useState<InstalledAppUsage[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [linuxBackend, setLinuxBackend] = useState<"flatpak" | "dnf">("flatpak");
  const [customPackageId, setCustomPackageId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [packsExpanded, setPacksExpanded] = useState(false);
  const errorAction = useAsyncAction();

  useEffect(() => {
    bridge.getAppsCatalog().then(setApps).catch(() => {});
    bridge.getInstalledAppUsage().then(setInstalledAppUsage).catch(() => {});
  }, []);

  const suggestedUninstalls = useMemo(
    () =>
      installedAppUsage
        .filter((a) => a.last_used_days_ago >= settings.unusedAppThresholdDays)
        .sort((a, b) => b.install_size_bytes - a.install_size_bytes),
    [installedAppUsage, settings.unusedAppThresholdDays]
  );

  // Proactive nudge, once per time this view's usage data loads (not on
  // every render) -- lets someone find out about unused apps without
  // having to think to check the Get Apps tab first.
  const notifiedForCountRef = React.useRef<number | null>(null);
  useEffect(() => {
    if (installedAppUsage.length === 0) return;
    if (notifiedForCountRef.current === suggestedUninstalls.length) return;
    notifiedForCountRef.current = suggestedUninstalls.length;
    if (suggestedUninstalls.length === 0) return;
    const totalBytes = suggestedUninstalls.reduce((acc, a) => acc + a.install_size_bytes, 0);
    notify(
      "unusedApps",
      `${suggestedUninstalls.length} unused app${suggestedUninstalls.length === 1 ? "" : "s"} found`,
      `Not opened in ${settings.unusedAppThresholdDays}+ days, using ${formatBytes(totalBytes).formatted}. Check Get Apps to review.`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedUninstalls, installedAppUsage.length]);

  const handleUninstallSuggested = (app: InstalledAppUsage) => {
    openDangerModal({
      title: `Uninstall ${app.name}?`,
      description: `${app.name} hasn't been opened in ${app.last_used_days_ago} days and takes up ${formatBytes(app.install_size_bytes).formatted}. This removes it from your system; user data files are preserved.`,
      requiresElevation: isWindows,
      riskLevel: "moderate",
      confirmWord: "UNINSTALL",
      onConfirm: async () => {
        setIsProcessing(true);
        addLog(`[Suggested Uninstalls] Uninstalling ${app.name} (unused ${app.last_used_days_ago}d)...`);
        await errorAction.run(
          async () => {
            const [report] = await bridge.uninstallApps([app.id]);
            addLog(`[Suggested Uninstalls] ${report?.details ?? "Done"}`);
            const updated = await bridge.getInstalledAppUsage();
            setInstalledAppUsage(updated);
          },
          {
            formatError: (e) => {
              addLog(`[Suggested Uninstalls] Error uninstalling ${app.name}: ${e}`);
              return `Uninstalling ${app.name} failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsProcessing(false);
      },
    });
  };
  const [activeSubTab, setActiveSubTab] = useState<"catalog" | "leftovers">("catalog");
  const [leftovers, setLeftovers] = useState<AppLeftover[]>([]);
  const [isLoadingLeftovers, setIsLoadingLeftovers] = useState(false);

  useEffect(() => {
    if (activeSubTab === "leftovers") {
      loadLeftovers();
    }
  }, [activeSubTab]);

  const loadLeftovers = async () => {
    setIsLoadingLeftovers(true);
    await errorAction.run(
      async () => {
        const items = await bridge.getLeftovers();
        setLeftovers(items);
      },
      {
        formatError: (e) => {
          addLog(`Error loading leftovers: ${e}`);
          return `Failed to scan for orphaned app leftovers: ${e instanceof Error ? e.message : String(e)}`;
        },
      }
    );
    setIsLoadingLeftovers(false);
  };

  const handleCleanAllLeftovers = () => {
    const totalBytes = leftovers.reduce((acc, l) => acc + l.total_bytes, 0);
    const totalFormatted = formatBytes(totalBytes).formatted;

    openDangerModal({
      title: "Purge All Orphaned App Leftovers?",
      description: `Cleans all ${leftovers.length} detected application leftovers (${totalFormatted}). These configurations and caches belong to apps no longer installed.`,
      requiresElevation: false,
      riskLevel: "safe",
      onConfirm: async () => {
        setIsProcessing(true);
        addLog("[App Leftovers] Purging orphaned app stores...");
        await errorAction.run(
          async () => {
            const res = await bridge.cleanLeftovers();
            addLog(`[App Leftovers] ${res.details}`);
            await loadLeftovers();
          },
          {
            formatError: (e) => {
              addLog(`[App Leftovers] Clean error: ${e}`);
              return `Purging app leftovers failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsProcessing(false);
      },
    });
  };


  const categories: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All Apps", icon: <Package className="w-3.5 h-3.5" /> },
    { id: "browsers", label: "Browsers", icon: <Globe className="w-3.5 h-3.5" /> },
    { id: "communication", label: "Chat & Social", icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "development", label: "Developer", icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: "gaming", label: "Gaming", icon: <Gamepad2 className="w-3.5 h-3.5" /> },
    { id: "media_tools", label: "Media", icon: <Video className="w-3.5 h-3.5" /> },
    { id: "utilities", label: "Utilities", icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: "privacy", label: "Privacy", icon: <Lock className="w-3.5 h-3.5" /> },
  ];

  const getCategoryIcon = (category: string) => {
    return categories.find((c) => c.id === category)?.icon || <Package className="w-4 h-4" />;
  };

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const matchesCategory = activeCategory === "all" || app.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.windows_winget_id.toLowerCase().includes(q) ||
        app.linux_flatpak_id.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [apps, activeCategory, searchQuery]);

  const toggleApp = (id: string) => {
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applyPreset = (preset: "dev" | "gaming" | "privacy") => {
    const idsToSelect = new Set(selectedAppIds);
    if (preset === "dev") {
      ["vscode", "git", "docker_podman", "nodejs", "dbeaver"].forEach((id) => idsToSelect.add(id));
    } else if (preset === "gaming") {
      ["steam", "heroic", "lutris", "discord", "obs_studio"].forEach((id) => idsToSelect.add(id));
    } else if (preset === "privacy") {
      ["brave", "firefox", "bitwarden", "keepassxc", "bleachbit"].forEach((id) => idsToSelect.add(id));
    }
    setSelectedAppIds(idsToSelect);
  };

  const handleInstallSelected = async () => {
    const ids = Array.from(selectedAppIds);
    if (ids.length === 0) return;

    const backendLabel = isWindows ? "WinGet" : linuxBackend === "dnf" ? "DNF" : "Flathub";
    const title = `Install ${ids.length} Application(s)`;
    const description = `This will invoke the native package manager (${backendLabel}) to install the selected apps silently and accept verified publisher terms.`;

    openDangerModal({
      title,
      description,
      requiresElevation: isWindows || linuxBackend === "dnf",
      riskLevel: "safe",
      confirmWord: "INSTALL",
      onConfirm: async () => {
        setIsProcessing(true);
        addLog(`[App Downloader] Initiating installation of ${ids.length} apps via ${backendLabel}...`);
        await errorAction.run(
          async () => {
            const reports = await bridge.installApps(ids, isLinux ? linuxBackend : undefined);
            for (const r of reports) {
              if (r.succeeded) {
                addLog(`  ✔ ${r.name}: ${r.details}`);
              } else {
                addLog(`  ✖ ${r.name} error: ${r.details}`);
              }
            }
            const updated = await bridge.getAppsCatalog();
            setApps(updated);
            setSelectedAppIds(new Set());
            addLog(`[App Downloader] Installation run completed.`);
          },
          {
            formatError: (e) => {
              addLog(`[App Downloader] Batch installation error: ${e}`);
              return `App installation failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsProcessing(false);
      },
    });
  };

  const handleUninstall = async (app: AppDefinition) => {
    const backendLabel = isWindows ? "WinGet" : "Flatpak";
    openDangerModal({
      title: `Uninstall ${app.name}?`,
      description: `This will remove ${app.name} from your system using ${backendLabel}. User data files will be preserved.`,
      requiresElevation: isWindows,
      riskLevel: "moderate",
      confirmWord: "UNINSTALL",
      onConfirm: async () => {
        setIsProcessing(true);
        addLog(`[App Downloader] Uninstalling ${app.name}...`);
        await errorAction.run(
          async () => {
            const report = await bridge.uninstallApp(app.id);
            addLog(`[App Downloader] ${report.details}`);
            const updated = await bridge.getAppsCatalog();
            setApps(updated);
          },
          {
            formatError: (e) => {
              addLog(`[App Downloader] Error uninstalling: ${e}`);
              return `Uninstalling ${app.name} failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsProcessing(false);
      },
    });
  };

  const handleInstallCustom = () => {
    if (!customPackageId.trim()) return;
    const pkg = customPackageId.trim();
    const backendLabel = isWindows ? "WinGet" : linuxBackend === "dnf" ? "DNF" : "Flathub";

    openDangerModal({
      title: `Install Custom Package: ${pkg}`,
      description: `Runs '${backendLabel} install ${pkg}' directly.`,
      requiresElevation: isWindows || linuxBackend === "dnf",
      riskLevel: "safe",
      confirmWord: "INSTALL",
      onConfirm: async () => {
        setIsProcessing(true);
        addLog(`[Custom App] Installing package ID: ${pkg}...`);
        await errorAction.run(
          async () => {
            const reports = await bridge.installApps([pkg], isLinux ? linuxBackend : undefined);
            addLog(`[Custom App] ${reports[0]?.details || "Done"}`);
            setCustomPackageId("");
          },
          {
            formatError: (e) => {
              addLog(`[Custom App] Error installing package: ${e}`);
              return `Installing package "${pkg}" failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsProcessing(false);
      },
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto select-none">
      {errorAction.error && (
        <ErrorBanner message={errorAction.error} onDismiss={errorAction.dismiss} />
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-br from-white dark:from-slate-800 to-pink-50/40 rounded-3xl p-8 border-2 border-pink-100 shadow-duo flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6 w-full md:w-auto min-w-0">
          <Mascot mood="happy" size="lg" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PixelBadge label="App Downloader" variant="pink" />
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                Fast Native Installer
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Get & Install Applications
            </h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 max-w-lg">
              Install curated cross-platform applications without third-party bloat.
              Powered directly by {isWindows ? "Microsoft WinGet" : "Flathub & Fedora DNF"}.
            </p>
          </div>
        </div>

        {/* Backend Status Pill */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm text-center min-w-[170px]">
          <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-black text-xs mb-1">
            <CheckCircle className="w-4 h-4" />
            <span>Verified Source</span>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-slate-100">
            {isWindows ? "Windows WinGet" : "Flathub & DNF"}
          </div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
            {isWindows ? "Official Package Manager" : "Sandboxed & Native"}
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm flex items-center gap-2">
        <button
          onClick={() => setActiveSubTab("catalog")}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeSubTab === "catalog"
              ? "bg-slate-900 text-white shadow-duo-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-900/40"
          }`}
        >
          <Package className="w-4 h-4 text-pink-400" />
          <span>App Catalog ({apps.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab("leftovers")}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeSubTab === "leftovers"
              ? "bg-slate-900 text-white shadow-duo-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-900/40"
          }`}
        >
          <Trash2 className="w-4 h-4 text-amber-500" />
          <span>Orphaned App Leftovers ({leftovers.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUGGESTED UNINSTALLS (usage-based, distinct from orphaned leftovers)      */}
      {/* Casual: this IS the one dominant focal module -- mascot + headline +     */}
      {/* the list, with Quick Starter Packs tucked behind an expand toggle below. */}
      {/* Advanced: unchanged compact card, just with a responsive row fix.        */}
      {/* ========================================================================= */}
      {viewMode === "casual" ? (
        <div className="animate-slide-down bg-gradient-to-b from-white dark:from-slate-800 to-amber-50/60 rounded-[2rem] p-10 sm:p-12 border-2 border-amber-100 shadow-duo space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <Mascot mood={suggestedUninstalls.length > 0 ? "alert" : "happy"} size="lg" />
            <PixelBadge label="Suggested Uninstalls" variant="pink" />
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {suggestedUninstalls.length === 0
                ? "Nothing Gathering Dust!"
                : `${suggestedUninstalls.length} App${
                    suggestedUninstalls.length > 1 ? "s" : ""
                  } Haven't Been Opened in ${settings.unusedAppThresholdDays}+ Days`}
            </h2>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
              {suggestedUninstalls.length === 0
                ? "Every installed app has been opened recently -- nothing to suggest removing right now."
                : `Still fully installed and safe to keep -- nothing here is removed automatically. Free up ${
                    formatBytes(
                      suggestedUninstalls.reduce((acc, a) => acc + a.install_size_bytes, 0)
                    ).formatted
                  } whenever you're ready.`}
            </p>
          </div>

          {suggestedUninstalls.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
              {suggestedUninstalls.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 dark:text-slate-100 text-sm truncate">{app.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                      Not opened in {app.last_used_days_ago} days ·{" "}
                      {formatBytes(app.install_size_bytes).formatted}
                    </div>
                  </div>
                  <TactileButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUninstallSuggested(app)}
                    disabled={isProcessing}
                    className="shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    Uninstall
                  </TactileButton>
                </div>
              ))}
            </div>
          )}

          {/* Quick Starter Packs -- tucked behind an expand toggle, per the        */}
          {/* lesson-screen brief, so it no longer competes with the focal module. */}
          <div className="pt-2 border-t border-amber-100/70">
            <button
              type="button"
              onClick={() => setPacksExpanded((v) => !v)}
              aria-expanded={packsExpanded}
              className="w-full flex items-center justify-center gap-2 text-xs font-black text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 py-2 group"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{packsExpanded ? "Hide Quick Starter Packs" : "Show Quick Starter Packs"}</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform group-hover:text-slate-700 dark:group-hover:text-slate-300 ${
                  packsExpanded ? "rotate-180" : ""
                }`}
              />
            </button>

            <div className={`collapsible-rows ${packsExpanded ? "is-expanded" : ""}`}>
              <div className="collapsible-inner">
                <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  <button
                    type="button"
                    onClick={() => applyPreset("dev")}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 transition-all text-left shadow-duo-sm active:translate-y-[1px]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold">
                      <Code2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 dark:text-slate-100 text-xs">Dev Workstation</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                        VS Code, Git, Podman, Node.js
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset("gaming")}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border-2 border-purple-100 bg-purple-50/40 hover:bg-purple-50 transition-all text-left shadow-duo-sm active:translate-y-[1px]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold">
                      <Gamepad2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 dark:text-slate-100 text-xs">Gamer Pack</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                        Steam, Heroic, Discord, OBS
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset("privacy")}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 transition-all text-left shadow-duo-sm active:translate-y-[1px]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 dark:text-slate-100 text-xs">Privacy Starter</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                        Brave, Bitwarden, BleachBit
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        suggestedUninstalls.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-amber-100 shadow-duo space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  <span>Suggested Uninstalls</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                  Installed apps you haven't opened in {settings.unusedAppThresholdDays}+ days -- still fully
                  installed, just gathering dust. Nothing here is removed automatically.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestedUninstalls.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 dark:text-slate-100 text-sm truncate">{app.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                      Not opened in {app.last_used_days_ago} days ·{" "}
                      {formatBytes(app.install_size_bytes).formatted}
                    </div>
                  </div>
                  <TactileButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUninstallSuggested(app)}
                    disabled={isProcessing}
                    className="shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    Uninstall
                  </TactileButton>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Leftovers Sub-View */} {activeSubTab === "leftovers" ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-amber-500" />
                <span>Orphaned Application Leftovers Scanner</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                Detects leftover directories, cache files, and configurations left behind by uninstalled Flatpaks, RPMs, and Windows apps.
              </p>
            </div>
            <TactileButton
              variant="danger"
              size="sm"
              onClick={handleCleanAllLeftovers}
              disabled={leftovers.length === 0 || isProcessing}
            >
              <Trash2 className="w-4 h-4" />
              <span>Purge All Leftovers</span>
            </TactileButton>
          </div>

          {isLoadingLeftovers ? (
            <CardSkeleton count={4} />
          ) : leftovers.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-lg font-black text-slate-800 dark:text-slate-200">No Orphaned App Leftovers Detected</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                No uninstalled app configuration directories or leftover caches found.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leftovers.map((leftover) => {
                const leftoverFormatted = formatBytes(leftover.total_bytes).formatted;
                return (
                  <div key={leftover.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                          {leftover.source === "flatpak_orphan" ? "Flatpak Leftover" : "Windows Orphan"}
                        </span>
                        <span className="text-xs font-mono font-bold text-rose-600">{leftoverFormatted}</span>
                      </div>
                      <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm">{leftover.app_name}</h4>
                      <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1 truncate">
                        Paths: {leftover.paths.join(", ")}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{leftover.file_count} cached files</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Safe to Purge</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>

      {/* Category Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? "bg-slate-900 text-white shadow-duo-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search apps or IDs..."
              aria-label="Search apps or IDs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-miri-400"
            />
          </div>
        </div>

        {/* Advanced Source Controls */}
        {viewMode === "power" && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {isLinux && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Linux Source:</span>
                <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setLinuxBackend("flatpak")}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                      linuxBackend === "flatpak"
                        ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Flathub (Flatpak)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinuxBackend("dnf")}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                      linuxBackend === "dnf"
                        ? "bg-white dark:bg-slate-800 text-indigo-700 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    DNF (RPM)
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
              <input
                type="text"
                placeholder={isWindows ? "Custom WinGet ID..." : "Custom Flatpak ID..."}
                aria-label={isWindows ? "Custom WinGet ID" : "Custom Flatpak ID"}
                value={customPackageId}
                onChange={(e) => setCustomPackageId(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-400 w-48"
              />
              <TactileButton
                variant="secondary"
                size="sm"
                onClick={handleInstallCustom}
                disabled={!customPackageId.trim() || isProcessing}
              >
                <Plus className="w-3.5 h-3.5" />
                Install ID
              </TactileButton>
            </div>
          </div>
        )}
      </div>

      {/* App Grid */}
      {apps.length === 0 ? (
        <AppCatalogSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => {
            const isSelected = selectedAppIds.has(app.id);
            const pkgId = isWindows
              ? app.windows_winget_id
              : linuxBackend === "dnf" && app.linux_dnf_package
              ? `dnf: ${app.linux_dnf_package}`
              : app.linux_flatpak_id;

            return (
              <div
                key={app.id}
                role="checkbox"
                aria-checked={isSelected}
                aria-label={`Select ${app.name}`}
                tabIndex={0}
                onClick={() => toggleApp(app.id)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    toggleApp(app.id);
                  }
                }}
                className={`card-duo flex flex-col justify-between transition-all cursor-pointer select-none p-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-miri-400/60 ${
                  isSelected
                    ? "border-2 border-miri-400 bg-miri-50/25 shadow-duo"
                    : "border-2 border-slate-100 dark:border-slate-700/60 hover:border-slate-200 shadow-duo-sm"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <PixelCheckbox checked={isSelected} presentational />
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                        {getCategoryIcon(app.category)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {app.is_installed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Installed
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {app.category}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-base">{app.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 leading-relaxed">
                    {app.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[170px]" title={pkgId || ""}>
                    {pkgId}
                  </span>
                  {app.is_installed && (
                    <button
                      type="button"
                      aria-label={`Uninstall ${app.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUninstall(app);
                      }}
                      className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Execution Bar */}
      {selectedAppIds.size > 0 && (
        <div className="sticky bottom-4 z-20 bg-slate-900 text-white rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-[#58CC02] text-white flex items-center justify-center font-bold">
              <Download className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-black text-sm">
                Ready to install {selectedAppIds.size} application{selectedAppIds.size > 1 ? "s" : ""}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                Installation via native {isWindows ? "WinGet" : linuxBackend === "dnf" ? "DNF" : "Flathub"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedAppIds(new Set())}
              className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-white px-3 py-2"
            >
              Clear
            </button>
            <TactileButton
              variant="primary"
              size="md"
              pill={viewMode === "casual"}
              onClick={handleInstallSelected}
              disabled={isProcessing}
            >
              Install Selected ({selectedAppIds.size})
            </TactileButton>
          </div>
        </div>
      )}
    </>
  )}
</div>
  );
};