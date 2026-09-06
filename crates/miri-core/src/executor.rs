use crate::audit::AuditJournal;
use crate::dev_cache::DevCacheCleaner;
use crate::models::{CleanExecutionPlan, CleanExecutionResult, CleanTarget, RiskLevel};
use crate::rules::RuleEngine;
use crate::scanner::Scanner;
use crate::snapshot::SnapshotManager;
use crate::tweaks::LinuxTweaks;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

pub struct Executor;

impl Executor {
    pub fn execute_plan(plan: &CleanExecutionPlan, targets: &[CleanTarget]) -> CleanExecutionResult {
        let mut freed_bytes = 0u64;
        let mut deleted_files = 0usize;
        let mut skipped_files = 0usize;
        let mut errors = Vec::new();

        // 1. Safety Checkpoint / Snapshot
        let mut snapshot_id = None;
        let mut has_high_risk = false;

        for target in targets {
            if plan.target_ids.contains(&target.id) {
                if target.risk_level >= RiskLevel::Moderate || target.requires_elevation {
                    has_high_risk = true;
                }
            }
        }

        if !plan.dry_run && (plan.create_snapshot || has_high_risk) {
            match SnapshotManager::create_safety_checkpoint("clean-task") {
                Ok(sid) => snapshot_id = Some(sid),
                Err(e) => errors.push(format!("Warning: Snapshot creation note: {}", e)),
            }
        }

        // 2. Process targets
        for target in targets {
            if !plan.target_ids.contains(&target.id) {
                continue;
            }

            if plan.dry_run {
                // Dry run: simulate without deletion
                freed_bytes += target.estimated_bytes;
                deleted_files += target.file_count;
                skipped_files += target.locked_count;
                continue;
            }

            // Real execution
            match target.id.as_str() {
                "fedora-dnf-cache" => {
                    match LinuxTweaks::clean_dnf_cache() {
                        Ok(rep) => {
                            if !rep.succeeded {
                                errors.push(format!("DNF Clean failed: {}", rep.details));
                            } else {
                                freed_bytes += target.estimated_bytes;
                            }
                        }
                        Err(e) => errors.push(e),
                    }
                }
                "systemd-journal" => {
                    match LinuxTweaks::vacuum_systemd_journal() {
                        Ok(rep) => {
                            if !rep.succeeded {
                                errors.push(format!("Journalctl vacuum failed: {}", rep.details));
                            } else {
                                freed_bytes += target.estimated_bytes;
                            }
                        }
                        Err(e) => errors.push(e),
                    }
                }
                "flatpak-unused" => {
                    match LinuxTweaks::clean_flatpak_unused() {
                        Ok(rep) => {
                            if !rep.succeeded {
                                errors.push(format!("Flatpak clean note: {}", rep.details));
                            }
                        }
                        Err(e) => errors.push(e),
                    }
                }
                "dev-cargo-cache" => {
                    let rep = DevCacheCleaner::clean_cargo_cache();
                    freed_bytes += rep.freed_bytes;
                }
                "dev-node-cache" | "dev-modern-js-cache" => {
                    let _ = DevCacheCleaner::clean_npm_cache();
                    let _ = DevCacheCleaner::clean_pnpm_cache();
                    freed_bytes += target.estimated_bytes;
                }
                "dev-python-cache" => {
                    let _ = DevCacheCleaner::clean_python_cache();
                    freed_bytes += target.estimated_bytes;
                }
                "dev-podman-cache" => {
                    let _ = DevCacheCleaner::clean_podman_cache();
                    let _ = DevCacheCleaner::clean_docker_images();
                    freed_bytes += target.estimated_bytes;
                }
                "dev-compiler-cache" => {
                    let _ = DevCacheCleaner::clean_ccache();
                    let _ = DevCacheCleaner::clean_cargo_cache();
                    freed_bytes += target.estimated_bytes;
                }
                "dev-jvm-cache" => {
                    let rep = DevCacheCleaner::clean_jvm_cache();
                    freed_bytes += rep.freed_bytes.max(target.estimated_bytes);
                }
                "dev-go-cache" => {
                    let _ = DevCacheCleaner::clean_go_cache();
                    freed_bytes += target.estimated_bytes;
                }
                _ => {
                    // Standard filesystem path sweeping
                    for path_str in &target.paths {
                        let expanded = RuleEngine::expand_path(path_str);
                        let p = Path::new(&expanded);

                        if !p.exists() {
                            continue;
                        }

                        // Blocklist verification
                        if RuleEngine::is_path_blocked(p) {
                            errors.push(format!("Blocked deletion for forbidden critical path: {}", p.display()));
                            continue;
                        }

                        // Symlink verification
                        if RuleEngine::is_symlink_or_reparse(p) {
                            skipped_files += 1;
                            continue;
                        }

                        if p.is_file() {
                            if Scanner::is_file_locked(p) {
                                skipped_files += 1;
                                continue;
                            }
                            if let Ok(meta) = p.metadata() {
                                let size = meta.len();
                                if fs::remove_file(p).is_ok() {
                                    freed_bytes += size;
                                    deleted_files += 1;
                                } else {
                                    skipped_files += 1;
                                }
                            }
                            continue;
                        }

                        // Directory recursive walk
                        for entry in WalkDir::new(p)
                            .follow_links(false)
                            .max_depth(8)
                            .into_iter()
                            .filter_entry(|e| !RuleEngine::is_path_blocked(e.path()))
                            .filter_map(|e| e.ok())
                        {
                            let file_path = entry.path();
                            if file_path.is_file() {
                                if Scanner::is_file_locked(file_path) {
                                    skipped_files += 1;
                                    continue;
                                }
                                if let Ok(meta) = file_path.metadata() {
                                    let size = meta.len();
                                    if fs::remove_file(file_path).is_ok() {
                                        freed_bytes += size;
                                        deleted_files += 1;
                                    } else {
                                        skipped_files += 1;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Audit Journal Recording
        let mut rollback_map = HashMap::new();
        rollback_map.insert("dry_run".to_string(), plan.dry_run.to_string());
        let audit_id = AuditJournal::record_operation(
            if plan.dry_run { "dry-run-scan" } else { "system-clean" },
            plan.target_ids.clone(),
            freed_bytes,
            snapshot_id.clone(),
            rollback_map,
        ).unwrap_or_else(|_| "audit-ephemeral".to_string());

        CleanExecutionResult {
            audit_id,
            freed_bytes,
            deleted_files,
            skipped_files,
            errors,
            snapshot_id,
            success: true,
        }
    }
}
