import React, { useState, useEffect } from "react";
import { useCleanerStore } from "../../store/useCleanerStore";
import { Mascot } from "../ui/Mascot";
import { TactileButton } from "../ui/TactileButton";
import { PixelBadge } from "../ui/PixelBadge";
import {
  HardDrive,
  Copy,
  FolderOpen,
  FileText,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  FolderTree,
  Zap,
  ChevronDown,
} from "lucide-react";
import { bridge } from "../../lib/bridge";
import { XRayReport, DuplicateGroup } from "../../types";
import { TreemapSkeleton, ListSkeleton } from "../ui/Skeleton";
import { formatBytes } from "../../lib/formatters";
import { ErrorBanner } from "../ui/ErrorBanner";
import { useAsyncAction } from "../../lib/useAsyncAction";

export const StorageView: React.FC = () => {
  const { addLog, openDangerModal } = useCleanerStore();

  const [activeSubTab, setActiveSubTab] = useState<"xray" | "twins">("xray");
  const [xrayReport, setXrayReport] = useState<XRayReport | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [targetPathInput, setTargetPathInput] = useState("");
  const [isReflinking, setIsReflinking] = useState(false);
  const [pathExpanded, setPathExpanded] = useState(false);
  const errorAction = useAsyncAction();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab]);

  const loadData = async () => {
    setIsLoading(true);
    await errorAction.run(
      async () => {
        if (activeSubTab === "xray") {
          addLog("Analyzing storage distribution...");
          const rep = await bridge.getXRay(targetPathInput || undefined);
          setXrayReport(rep);
          addLog(`Storage analysis ready: ${formatBytes(rep.total_scanned_bytes).formatted} scanned across ${rep.total_files} files.`);
        } else {
          addLog("Scanning for duplicate files...");
          const dups = await bridge.getDuplicates(targetPathInput || undefined);
          setDuplicateGroups(dups);
          const wastedFormatted = formatBytes(dups.reduce((acc, g) => acc + g.wasted_bytes, 0)).formatted;
          addLog(`Duplicate scan completed: ${dups.length} duplicate groups found (${wastedFormatted} wasted).`);
        }
      },
      {
        formatError: (e) => {
          if (activeSubTab === "xray") {
            addLog(`Storage analysis error: ${e}`);
            return `Storage analysis failed: ${e instanceof Error ? e.message : String(e)}`;
          }
          addLog(`Duplicate scan error: ${e}`);
          return `Duplicate scan failed: ${e instanceof Error ? e.message : String(e)}`;
        },
      }
    );
    setIsLoading(false);
  };

  const handleReflinkAll = async () => {
    openDangerModal({
      title: "Deduplicate with Btrfs Reflink",
      description: "This uses Btrfs Copy-on-Write to share identical data extents across all duplicate files. Zero files are deleted, and no data is lost.",
      requiresElevation: false,
      riskLevel: "safe",
      confirmWord: "DEDUPLICATE",
      onConfirm: async () => {
        setIsReflinking(true);
        addLog("Reflinking duplicate extents on Btrfs...");
        await errorAction.run(
          async () => {
            const res = await bridge.reflinkDuplicates(targetPathInput || undefined);
            addLog(res.details);
            await loadData();
          },
          {
            formatError: (e) => {
              addLog(`Reflink error: ${e}`);
              return `Reflinking duplicates failed: ${e instanceof Error ? e.message : String(e)}`;
            },
          }
        );
        setIsReflinking(false);
      },
    });
  };

  const categoryColors: Record<string, { bg: string; bar: string; label: string }> = {
    build_cache: { bg: "bg-emerald-50 text-emerald-800 border-emerald-200", bar: "bg-emerald-500", label: "Build Caches" },
    video: { bg: "bg-indigo-50 text-indigo-800 border-indigo-200", bar: "bg-indigo-500", label: "Videos" },
    archives_installers: { bg: "bg-amber-50 text-amber-800 border-amber-200", bar: "bg-amber-500", label: "Archives & Installers" },
    images: { bg: "bg-pink-50 text-pink-800 border-pink-200", bar: "bg-pink-500", label: "Photos & Images" },
    documents: { bg: "bg-sky-50 text-sky-800 border-sky-200", bar: "bg-sky-500", label: "Documents" },
    other: { bg: "bg-slate-100 text-slate-700 border-slate-200", bar: "bg-slate-400", label: "Other Files" },
  };

  const totalWastedBytes = duplicateGroups.reduce((acc, g) => acc + g.wasted_bytes, 0);
  const totalWastedFormatted = formatBytes(totalWastedBytes).formatted;

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none">
      {errorAction.error && (
        <ErrorBanner
          message={errorAction.error}
          onDismiss={errorAction.dismiss}
          onRetry={errorAction.retry}
          retryLabel="Retry"
        />
      )}

      {/* ========================================================================= */}
      {/* ONE HERO MODULE -- lesson-screen grammar: a single dominant focal card     */}
      {/* replacing the old header card + metric pill + separate sub-nav bar. The   */}
      {/* mascot anchors mood, stats collapse into a slim strip, the custom-path    */}
      {/* control tucks behind an expand toggle, and one big pill action drives    */}
      {/* whichever operation matters most for the active sub-tab.                 */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-b from-white to-amber-50/50 rounded-[2rem] p-10 sm:p-12 border-2 border-amber-100 shadow-duo text-center space-y-6">
        <div className="flex justify-center">
          <Mascot mood={isLoading ? "scanning" : "happy"} size="lg" />
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <PixelBadge label="Storage & Duplicates" variant="yellow" />
          <span className="text-xs font-bold text-slate-500">
            Visual Disk Treemap • Largest Files • Duplicate Extents
          </span>
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Storage Intelligence & Deduplication
        </h2>
        <p className="text-sm font-semibold text-slate-500 max-w-lg mx-auto leading-relaxed">
          Visualize where your disk space goes with interactive treemaps, uncover
          gigabyte-sized files, and eliminate duplicate files with Btrfs CoW.
        </p>

        {/* Slim consolidated stat strip -- both totals always visible, with the
            custom-path control tucked behind expansion instead of a third
            parallel card. */}
        <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-3 pt-1">
          <div className="text-center">
            <div className="text-2xl font-black text-amber-600 tabular-nums">
              {xrayReport ? formatBytes(xrayReport.total_scanned_bytes).formatted : "--"}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Analyzed
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-rose-600 tabular-nums">{totalWastedFormatted}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Wasted by Copies
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPathExpanded((v) => !v)}
            aria-expanded={pathExpanded}
            className="text-center group"
          >
            <div className="text-2xl font-black text-slate-400 flex items-center gap-1 justify-center">
              <FolderOpen className="w-5 h-5" />
              <ChevronDown className={`w-4 h-4 transition-transform ${pathExpanded ? "rotate-180" : ""}`} />
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700">
              {pathExpanded ? "Hide Path" : "Custom Path"}
            </div>
          </button>
        </div>

        {/* Secondary control tucked behind expansion, per the lesson-screen brief */}
        <div className={`collapsible-rows ${pathExpanded ? "is-expanded" : ""}`}>
          <div className="collapsible-inner">
            <div className="pt-4 flex items-center justify-center">
              <input
                type="text"
                placeholder="Custom path (e.g. ~/Downloads)..."
                aria-label="Custom directory path to inspect"
                value={targetPathInput}
                onChange={(e) => setTargetPathInput(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400 w-full max-w-xs"
              />
            </div>
          </div>
        </div>

        {/* Sub-tab segmented toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 p-1 bg-slate-100/80 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveSubTab("xray")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeSubTab === "xray"
                  ? "bg-white text-slate-900 shadow-duo-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FolderTree className="w-4 h-4 text-amber-500" />
              <span>Storage Breakdown</span>
            </button>
            <button
              onClick={() => setActiveSubTab("twins")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeSubTab === "twins"
                  ? "bg-white text-slate-900 shadow-duo-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Copy className="w-4 h-4 text-indigo-500" />
              <span>Duplicate Finder</span>
            </button>
          </div>
        </div>

        {/* ONE big pill primary action -- Reflink once duplicates are found and
            ready to dedupe, otherwise Re-Scan is the obvious next step. */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {activeSubTab === "twins" && duplicateGroups.length > 0 ? (
            <TactileButton
              variant="primary"
              size="hero"
              pill
              onClick={handleReflinkAll}
              disabled={isReflinking}
              aria-busy={isReflinking}
            >
              <Zap className="w-5 h-5 shrink-0" />
              {isReflinking ? "Reflinking..." : `Reflink Duplicates (${totalWastedFormatted})`}
            </TactileButton>
          ) : (
            <TactileButton
              variant="primary"
              size="hero"
              pill
              onClick={loadData}
              disabled={isLoading}
              aria-busy={isLoading}
            >
              <RefreshCw className={`w-5 h-5 shrink-0 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Scanning..." : "Re-Scan"}
            </TactileButton>
          )}

          {/* Secondary action -- visually subordinate to the one primary CTA */}
          {activeSubTab === "twins" && duplicateGroups.length > 0 && (
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline decoration-dotted underline-offset-4 disabled:opacity-50"
            >
              Re-Scan
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW: STORAGE BREAKDOWN */}
      {/* ========================================================================= */}
      {activeSubTab === "xray" && (
        isLoading ? (
          <TreemapSkeleton />
        ) : xrayReport ? (
          <div className="space-y-6">
          {/* Category Distribution Bar */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-500" />
                <span>Storage Category Breakdown</span>
              </h3>
              <span className="text-xs font-mono font-bold text-slate-400">
                Root: {xrayReport.root_path}
              </span>
            </div>

            {/* Segmented Percentage Bar */}
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              {Object.entries(xrayReport.by_category).map(([cat, bytes]) => {
                const pct =
                  xrayReport.total_scanned_bytes > 0
                    ? (bytes / xrayReport.total_scanned_bytes) * 100
                    : 0;
                if (pct < 1) return null;
                const info = categoryColors[cat] || categoryColors.other;
                return (
                  <div
                    key={cat}
                    style={{ width: `${pct}%` }}
                    className={`${info.bar} h-full transition-all`}
                    title={`${info.label}: ${formatBytes(bytes).formatted} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>

            {/* Category Legend Tags */}
            <div className="flex items-center gap-3 flex-wrap pt-2">
              {Object.entries(xrayReport.by_category).map(([cat, bytes]) => {
                const info = categoryColors[cat] || categoryColors.other;
                return (
                  <div
                    key={cat}
                    className={`text-xs font-bold px-3 py-1 rounded-xl border flex items-center gap-2 ${info.bg}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${info.bar}`} />
                    <span>{info.label}:</span>
                    <span className="font-mono">{formatBytes(bytes).formatted}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visual Treemap Folder Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-sm font-black text-slate-900">
                Largest Storage Folders (Treemap Blocks)
              </h4>
              <span className="text-xs font-bold text-slate-400">Top 15 Directories</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {xrayReport.top_folders.map((folder) => {
                const folderFormatted = formatBytes(folder.size_bytes).formatted;
                return (
                  <div
                    key={folder.path}
                    className="bg-white rounded-2xl p-4 border-2 border-slate-100 shadow-duo-sm hover:border-amber-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <FolderOpen className="w-5 h-5 text-amber-500" />
                        <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                          {folder.percentage}% of disk
                        </span>
                      </div>
                      <h5 className="font-black text-slate-800 text-sm truncate" title={folder.name}>
                        {folder.name}
                      </h5>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5" title={folder.path}>
                        {folder.path}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-800">{folderFormatted}</span>
                      <span className="text-xs text-slate-400">{folder.file_count} files</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Largest Individual Files List */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>Heavyweight Files (&gt; 1 MB)</span>
              </h4>
              <span className="text-xs font-bold text-slate-400">
                Top {xrayReport.largest_files.length} Candidates
              </span>
            </div>

            <div className="space-y-2">
              {xrayReport.largest_files.map((file) => {
                const fileFormatted = formatBytes(file.size_bytes).formatted;
                const info = categoryColors[file.category] || categoryColors.other;
                return (
                  <div
                    key={file.path}
                    className="p-3 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">{file.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${info.bg}`}>
                          {info.label}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        {file.path} • Modified: {file.modified_time}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-pixel text-xs font-bold text-slate-800">{fileFormatted}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        ) : null
      )}

      {/* ========================================================================= */}
      {/* VIEW: DUPLICATE FINDER */}
      {/* ========================================================================= */}
      {activeSubTab === "twins" && (
        <div className="space-y-4">
          {/* Btrfs Reflink Explainer Banner */}
          <div className="bg-emerald-50/60 rounded-3xl p-6 border-2 border-emerald-200/80 shadow-duo-sm space-y-2">
            <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Smart Btrfs Copy-on-Write Reflink Technology</span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed max-w-2xl">
              On Fedora's default <strong>Btrfs</strong> filesystem, duplicate files can be linked to share
              the same disk storage blocks via <strong>Reflink (`cp --reflink`)</strong>. Both copies stay in place
              and function normally, but occupy the disk space of only one file!
            </p>
          </div>

          {/* Duplicates List */}
          {isLoading ? (
            <ListSkeleton count={4} />
          ) : duplicateGroups.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border-2 border-slate-100 shadow-duo text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-lg font-black text-slate-800">No Duplicate Files Detected</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No identical files found in the scanned directory. Your storage is tidy and non-redundant!
              </p>
            </div>
          ) : (
            duplicateGroups.map((group) => {
              const wastedFormatted = formatBytes(group.wasted_bytes).formatted;
              const singleFormatted = formatBytes(group.file_size).formatted;

              return (
                <div
                  key={group.group_id}
                  className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-duo-sm space-y-4"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <Copy className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-sm font-black text-slate-900">
                        {group.count} Identical Copies ({singleFormatted} each)
                      </h4>
                      {group.can_reflink && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Btrfs CoW Ready
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                      Wasted: {wastedFormatted}
                    </div>
                  </div>

                  {/* Files in Group */}
                  <div className="space-y-2">
                    {group.files.map((file, idx) => (
                      <div
                        key={file.path}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          {file.is_original ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200">
                              Primary
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-900 border border-slate-300">
                              {`Copy #${idx}`}
                            </span>
                          )}
                          <span className="font-mono text-slate-800 truncate" title={file.path}>
                            {file.path}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">{file.modified_time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
export default StorageView;
