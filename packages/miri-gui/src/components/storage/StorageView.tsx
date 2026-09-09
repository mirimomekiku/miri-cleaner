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
  Search,
  Globe,
  MoreVertical,
} from "lucide-react";
import { bridge } from "../../lib/bridge";
import { XRayReport, DuplicateGroup } from "../../types";
import { TreemapSkeleton, ListSkeleton } from "../ui/Skeleton";
import { formatBytes } from "../../lib/formatters";
import { ErrorBanner } from "../ui/ErrorBanner";
import { useAsyncAction } from "../../lib/useAsyncAction";
import { ContextMenu } from "../ui/ContextMenu";
import { FilePropertiesModal } from "./FilePropertiesModal";
import { useFileActions } from "../../lib/useFileActions";
import { categoryStyle } from "../../lib/fileCategories";
import { BigFileFinderView } from "./BigFileFinderView";
import { BrowserCleanupView } from "./BrowserCleanupView";
import { StatTile } from "../ui/StatTile";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { HeroCard } from "../ui/HeroCard";

type StorageSubTab = "xray" | "twins" | "bigfiles" | "browsers";

export const StorageView: React.FC = () => {
  const { addLog, openDangerModal } = useCleanerStore();

  const [activeSubTab, setActiveSubTab] = useState<StorageSubTab>("xray");
  const [xrayReport, setXrayReport] = useState<XRayReport | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [targetPathInput, setTargetPathInput] = useState("");
  const [isReflinking, setIsReflinking] = useState(false);
  const [pathExpanded, setPathExpanded] = useState(false);
  const errorAction = useAsyncAction();

  const fileActions = useFileActions(() => loadData());

  useEffect(() => {
    if (activeSubTab === "xray" || activeSubTab === "twins") {
      loadData();
    }
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
      {fileActions.error && (
        <ErrorBanner message={fileActions.error} onDismiss={fileActions.dismissError} />
      )}

      {/* ========================================================================= */}
      {/* ONE HERO MODULE -- lesson-screen grammar: a single dominant focal card     */}
      {/* replacing the old header card + metric pill + separate sub-nav bar. The   */}
      {/* mascot anchors mood, stats collapse into a slim strip, the custom-path    */}
      {/* control tucks behind an expand toggle, and one big pill action drives    */}
      {/* whichever operation matters most for the active sub-tab.                 */}
      {/* ========================================================================= */}
      <HeroCard
        accent="amber"
        mascot={<Mascot mood={isLoading ? "scanning" : "happy"} size="lg" />}
        badgeLabel="Storage & Duplicates"
        badgeVariant="yellow"
        badgeSubtitle="Visual Disk Treemap • Largest Files • Duplicate Extents"
        heading="Storage Intelligence & Deduplication"
        description="Visualize where your disk space goes with interactive treemaps, uncover gigabyte-sized files, and eliminate duplicate files with Btrfs CoW."
        descriptionMaxWidth="max-w-lg"
      >
        {/* Slim consolidated stat strip -- both totals always visible, with the
            custom-path control tucked behind expansion instead of a third
            parallel card. */}
        <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-3 pt-1">
          <StatTile
            value={xrayReport ? formatBytes(xrayReport.total_scanned_bytes).formatted : "--"}
            label="Total Analyzed"
            valueClassName="text-amber-600"
          />
          <StatTile value={totalWastedFormatted} label="Wasted by Copies" valueClassName="text-rose-600" />
          <button
            type="button"
            onClick={() => setPathExpanded((v) => !v)}
            aria-expanded={pathExpanded}
            className="text-center group"
          >
            <div className="text-2xl font-black text-slate-400 dark:text-slate-500 flex items-center gap-1 justify-center">
              <FolderOpen className="w-5 h-5" />
              <ChevronDown className={`w-4 h-4 transition-transform ${pathExpanded ? "rotate-180" : ""}`} />
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-300">
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
                className="text-xs bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-400 w-full max-w-xs"
              />
            </div>
          </div>
        </div>

        {/* Sub-tab segmented toggle */}
        <SegmentedTabs
          value={activeSubTab}
          onChange={setActiveSubTab}
          options={[
            { value: "xray", label: "Storage Breakdown", icon: <FolderTree className="w-4 h-4 text-amber-500" /> },
            { value: "twins", label: "Duplicate Finder", icon: <Copy className="w-4 h-4 text-indigo-500" /> },
            { value: "bigfiles", label: "Big Files", icon: <Search className="w-4 h-4 text-rose-500" /> },
            { value: "browsers", label: "Browser Data", icon: <Globe className="w-4 h-4 text-sky-500" /> },
          ]}
        />

        {/* ONE big pill primary action -- Reflink once duplicates are found and
            ready to dedupe, otherwise Re-Scan is the obvious next step. Big
            Files and Browser Data drive their own scans, so this hero action
            only applies to the first two sub-tabs. */}
        {(activeSubTab === "xray" || activeSubTab === "twins") && (
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
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline decoration-dotted underline-offset-4 disabled:opacity-50"
            >
              Re-Scan
            </button>
          )}
        </div>
        )}
      </HeroCard>

      {/* ========================================================================= */}
      {/* VIEW: STORAGE BREAKDOWN */}
      {/* ========================================================================= */}
      {activeSubTab === "xray" && (
        isLoading ? (
          <TreemapSkeleton />
        ) : xrayReport ? (
          <div className="space-y-6">
          {/* Category Distribution Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-500" />
                <span>Storage Category Breakdown</span>
              </h3>
              <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
                Root: {xrayReport.root_path}
              </span>
            </div>

            {/* Segmented Percentage Bar */}
            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              {Object.entries(xrayReport.by_category).map(([cat, bytes]) => {
                const pct =
                  xrayReport.total_scanned_bytes > 0
                    ? (bytes / xrayReport.total_scanned_bytes) * 100
                    : 0;
                if (pct < 1) return null;
                const info = categoryStyle(cat);
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
                const info = categoryStyle(cat);
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
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Largest Storage Folders (Treemap Blocks)
              </h4>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Top 15 Directories</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {xrayReport.top_folders.map((folder) => {
                const folderFormatted = formatBytes(folder.size_bytes).formatted;
                return (
                  <div
                    key={folder.path}
                    onContextMenu={(e) => fileActions.openContextMenu(e, folder.path, folder.name, true)}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm hover:border-amber-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <FolderOpen className="w-5 h-5 text-amber-500" />
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {folder.percentage}% of disk
                          </span>
                          <button
                            type="button"
                            onClick={(e) => fileActions.openContextMenuAt(e.currentTarget, folder.path, folder.name, true)}
                            aria-label={`Actions for ${folder.name}`}
                            aria-haspopup="menu"
                            className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miri-400 shrink-0"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h5 className="font-black text-slate-800 dark:text-slate-200 text-sm truncate" title={folder.name}>
                        {folder.name}
                      </h5>
                      <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5" title={folder.path}>
                        {folder.path}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{folderFormatted}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{folder.file_count} files</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Largest Individual Files List */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>Heavyweight Files (&gt; 1 MB)</span>
              </h4>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                Top {xrayReport.largest_files.length} Candidates
              </span>
            </div>

            <div className="space-y-2">
              {xrayReport.largest_files.map((file) => {
                const fileFormatted = formatBytes(file.size_bytes).formatted;
                const info = categoryStyle(file.category);
                return (
                  <div
                    key={file.path}
                    onContextMenu={(e) => fileActions.openContextMenu(e, file.path, file.name, false)}
                    className="p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60 hover:border-slate-200 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{file.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${info.bg}`}>
                          {info.label}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {file.path} • Modified: {file.modified_time}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-pixel text-xs font-bold text-slate-800 dark:text-slate-200">{fileFormatted}</span>
                      <button
                        type="button"
                        onClick={(e) => fileActions.openContextMenuAt(e.currentTarget, file.path, file.name, false)}
                        aria-label={`Actions for ${file.name}`}
                        aria-haspopup="menu"
                        className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-miri-400"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
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
          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 rounded-3xl p-6 border-2 border-emerald-200/80 dark:border-emerald-900/50 shadow-duo-sm space-y-2">
            <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200 font-black text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Smart Btrfs Copy-on-Write Reflink Technology</span>
            </div>
            <p className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed max-w-2xl">
              On Fedora's default <strong>Btrfs</strong> filesystem, duplicate files can be linked to share
              the same disk storage blocks via <strong>Reflink (`cp --reflink`)</strong>. Both copies stay in place
              and function normally, but occupy the disk space of only one file!
            </p>
          </div>

          {/* Duplicates List */}
          {isLoading ? (
            <ListSkeleton count={4} />
          ) : duplicateGroups.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-lg font-black text-slate-800 dark:text-slate-200">No Duplicate Files Detected</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
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
                  className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-700/60 shadow-duo-sm space-y-4"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <Copy className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {group.count} Identical Copies ({singleFormatted} each)
                      </h4>
                      {group.can_reflink && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Btrfs CoW Ready
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-900/50">
                      Wasted: {wastedFormatted}
                    </div>
                  </div>

                  {/* Files in Group */}
                  <div className="space-y-2">
                    {group.files.map((file, idx) => (
                      <div
                        key={file.path}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          {file.is_original ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              Primary
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600">
                              {`Copy #${idx}`}
                            </span>
                          )}
                          <span className="font-mono text-slate-800 dark:text-slate-200 truncate" title={file.path}>
                            {file.path}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{file.modified_time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeSubTab === "bigfiles" && <BigFileFinderView />}

      {activeSubTab === "browsers" && <BrowserCleanupView />}

      {fileActions.contextMenu && (
        <ContextMenu
          x={fileActions.contextMenu.x}
          y={fileActions.contextMenu.y}
          onClose={fileActions.closeContextMenu}
          items={fileActions.buildMenuItems()!}
        />
      )}

      {fileActions.propertiesPath && (
        <FilePropertiesModal
          path={fileActions.propertiesPath}
          onClose={() => fileActions.setPropertiesPath(null)}
        />
      )}
    </div>
  );
};
export default StorageView;
