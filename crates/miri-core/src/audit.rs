use crate::models::AuditEntry;
use crate::rules::RuleEngine;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

pub struct AuditJournal;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuditLogFile {
    pub entries: Vec<AuditEntry>,
}

impl AuditJournal {
    fn get_journal_path() -> PathBuf {
        let base_dir = if cfg!(windows) {
            std::env::var("APPDATA")
                .map(|p| format!("{}\\miri-cleaner", p))
                .unwrap_or_else(|_| ".miri-cleaner".to_string())
        } else {
            RuleEngine::expand_path("~/.config/miri-cleaner")
        };

        let path = PathBuf::from(base_dir);
        if !path.exists() {
            let _ = fs::create_dir_all(&path);
        }
        path.join("audit.json")
    }

    pub fn load_entries() -> Vec<AuditEntry> {
        let path = Self::get_journal_path();
        if let Ok(data) = fs::read_to_string(&path) {
            if let Ok(file) = serde_json::from_str::<AuditLogFile>(&data) {
                return file.entries;
            }
        }
        Vec::new()
    }

    pub fn record_operation(
        operation: &str,
        target_ids: Vec<String>,
        freed_bytes: u64,
        snapshot_id: Option<String>,
        rollback_payload: HashMap<String, String>,
    ) -> Result<String, String> {
        let mut entries = Self::load_entries();
        let entry_id = format!("audit-{}", Utc::now().format("%Y%m%d%H%M%S"));

        let entry = AuditEntry {
            id: entry_id.clone(),
            timestamp: Utc::now().to_rfc3339(),
            operation: operation.to_string(),
            target_ids,
            freed_bytes,
            snapshot_id,
            rollback_payload,
            is_rolled_back: false,
        };

        entries.insert(0, entry);

        // Keep last 100 entries
        if entries.len() > 100 {
            entries.truncate(100);
        }

        let file = AuditLogFile { entries };
        let json = serde_json::to_string_pretty(&file)
            .map_err(|e| format!("Serialization error: {}", e))?;

        let path = Self::get_journal_path();
        fs::write(path, json).map_err(|e| format!("Failed to write audit file: {}", e))?;

        Ok(entry_id)
    }

    pub fn mark_rolled_back(id: &str) -> Result<(), String> {
        let mut entries = Self::load_entries();
        let mut found = false;

        for entry in &mut entries {
            if entry.id == id {
                entry.is_rolled_back = true;
                found = true;
                break;
            }
        }

        if !found {
            return Err(format!("Audit entry {} not found", id));
        }

        let file = AuditLogFile { entries };
        let json = serde_json::to_string_pretty(&file)
            .map_err(|e| format!("Serialization error: {}", e))?;

        let path = Self::get_journal_path();
        fs::write(path, json).map_err(|e| format!("Failed to update audit file: {}", e))?;

        Ok(())
    }
}
