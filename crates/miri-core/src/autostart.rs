use crate::rules::RuleEngine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutostartItem {
    pub id: String,
    pub name: String,
    pub command: String,
    pub enabled: bool,
    pub file_path: String,
    pub impact: String, // "high" | "medium" | "low"
    pub source: String, // "user_autostart" | "system_autostart" | "registry"
}

pub struct AutostartManager;

impl AutostartManager {
    /// Discovers all autostart applications on Fedora / Linux and Windows
    pub fn get_autostart_items() -> Vec<AutostartItem> {
        let mut items = Vec::new();

        #[cfg(target_os = "linux")]
        {
            let user_autostart = RuleEngine::expand_path("~/.config/autostart");
            let p_user = Path::new(&user_autostart);
            if p_user.exists() {
                if let Ok(entries) = fs::read_dir(p_user) {
                    for entry in entries.filter_map(|e| e.ok()) {
                        let path = entry.path();
                        if path.extension().and_then(|e| e.to_str()) == Some("desktop") {
                            if let Some(item) = Self::parse_desktop_file(&path, "user_autostart") {
                                items.push(item);
                            }
                        }
                    }
                }
            }

            let sys_autostart = Path::new("/etc/xdg/autostart");
            if sys_autostart.exists() {
                if let Ok(entries) = fs::read_dir(sys_autostart) {
                    for entry in entries.filter_map(|e| e.ok()) {
                        let path = entry.path();
                        if path.extension().and_then(|e| e.to_str()) == Some("desktop") {
                            // Don't duplicate if already customized in user autostart
                            let file_name = path.file_name().unwrap_or_default();
                            if !items.iter().any(|i| i.file_path.ends_with(&*file_name.to_string_lossy())) {
                                if let Some(item) = Self::parse_desktop_file(&path, "system_autostart") {
                                    items.push(item);
                                }
                            }
                        }
                    }
                }
            }
        }

        #[cfg(target_os = "windows")]
        {
            // Windows startup folder and mock entries
            let appdata = std::env::var("APPDATA").unwrap_or_default();
            let startup_dir = format!("{}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup", appdata);
            let p_startup = Path::new(&startup_dir);
            if p_startup.exists() {
                if let Ok(entries) = fs::read_dir(p_startup) {
                    for entry in entries.filter_map(|e| e.ok()) {
                        let path = entry.path();
                        let name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                        items.push(AutostartItem {
                            id: format!("win-startup-{}", name),
                            name: name.clone(),
                            command: path.to_string_lossy().to_string(),
                            enabled: true,
                            file_path: path.to_string_lossy().to_string(),
                            impact: Self::estimate_impact(&name),
                            source: "startup_folder".to_string(),
                        });
                    }
                }
            }
        }

        items
    }

    fn parse_desktop_file(path: &Path, source: &str) -> Option<AutostartItem> {
        let content = fs::read_to_string(path).ok()?;
        let mut name = String::new();
        let mut exec = String::new();
        let mut hidden = false;
        let mut enabled = true;

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("Name=") && name.is_empty() {
                name = trimmed.trim_start_matches("Name=").to_string();
            } else if trimmed.starts_with("Exec=") && exec.is_empty() {
                exec = trimmed.trim_start_matches("Exec=").to_string();
            } else if trimmed.starts_with("Hidden=") {
                hidden = trimmed.trim_start_matches("Hidden=").to_lowercase() == "true";
            } else if trimmed.starts_with("X-GNOME-Autostart-enabled=") {
                enabled = trimmed.trim_start_matches("X-GNOME-Autostart-enabled=").to_lowercase() == "true";
            }
        }

        if name.is_empty() {
            name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
        }

        let is_active = enabled && !hidden;
        let impact = Self::estimate_impact(&name);

        Some(AutostartItem {
            id: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
            name,
            command: exec,
            enabled: is_active,
            file_path: path.to_string_lossy().to_string(),
            impact,
            source: source.to_string(),
        })
    }

    fn estimate_impact(name: &str) -> String {
        let lower = name.to_lowercase();
        if lower.contains("discord")
            || lower.contains("steam")
            || lower.contains("spotify")
            || lower.contains("docker")
            || lower.contains("slack")
            || lower.contains("teams")
            || lower.contains("electron")
        {
            "high".to_string()
        } else if lower.contains("cloud")
            || lower.contains("sync")
            || lower.contains("onedrive")
            || lower.contains("dropbox")
            || lower.contains("toolbox")
        {
            "medium".to_string()
        } else {
            "low".to_string()
        }
    }

    /// Toggles an autostart item on or off
    pub fn toggle_item(file_path: &str, enable: bool) -> Result<bool, String> {
        let p = Path::new(file_path);
        if !p.exists() {
            return Err("Autostart file does not exist".to_string());
        }

        let content = fs::read_to_string(p).map_err(|e| e.to_string())?;
        let mut new_lines = Vec::new();
        let mut has_hidden = false;
        let mut has_gnome = false;

        for line in content.lines() {
            if line.starts_with("Hidden=") {
                new_lines.push(format!("Hidden={}", !enable));
                has_hidden = true;
            } else if line.starts_with("X-GNOME-Autostart-enabled=") {
                new_lines.push(format!("X-GNOME-Autostart-enabled={}", enable));
                has_gnome = true;
            } else {
                new_lines.push(line.to_string());
            }
        }

        if !has_hidden {
            new_lines.push(format!("Hidden={}", !enable));
        }
        if !has_gnome {
            new_lines.push(format!("X-GNOME-Autostart-enabled={}", enable));
        }

        fs::write(p, new_lines.join("
")).map_err(|e| e.to_string())?;
        Ok(enable)
    }
}
