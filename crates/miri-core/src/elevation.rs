use crate::models::OsType;
use std::process::Command;

pub struct ElevationManager;

impl ElevationManager {
    /// Returns true if current process is running as root (Linux) or Administrator (Windows)
    pub fn is_elevated() -> bool {
        let os = OsType::current();
        match os {
            OsType::Linux => {
                // On Unix, check if effective UID is 0
                unsafe { libc_euid_zero() }
            }
            OsType::Windows => {
                // Check if process has administrator token
                let output = Command::new("powershell")
                    .args([
                        "-NoProfile",
                        "-NonInteractive",
                        "-Command",
                        "([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)",
                    ])
                    .output();
                if let Ok(out) = output {
                    String::from_utf8_lossy(&out.stdout).trim().eq_ignore_ascii_case("true")
                } else {
                    false
                }
            }
            _ => false,
        }
    }

    /// Spawns a privileged helper command via Polkit (pkexec) on Linux or UAC on Windows
    pub fn run_elevated_command(command: &str, args: &[&str]) -> Result<(bool, String, String), String> {
        let os = OsType::current();

        match os {
            OsType::Linux => {
                if Self::is_elevated() {
                    let output = Command::new(command)
                        .args(args)
                        .output()
                        .map_err(|e| format!("Command execution failed: {}", e))?;
                    return Ok((
                        output.status.success(),
                        String::from_utf8_lossy(&output.stdout).to_string(),
                        String::from_utf8_lossy(&output.stderr).to_string(),
                    ));
                }

                // Use pkexec with fallback to sudo
                let mut pkexec_cmd = Command::new("pkexec");
                pkexec_cmd.arg(command).args(args);

                let output = pkexec_cmd.output().or_else(|_| {
                    Command::new("sudo").arg(command).args(args).output()
                }).map_err(|e| format!("Elevation prompt failed: {}", e))?;

                Ok((
                    output.status.success(),
                    String::from_utf8_lossy(&output.stdout).to_string(),
                    String::from_utf8_lossy(&output.stderr).to_string(),
                ))
            }
            OsType::Windows => {
                if Self::is_elevated() {
                    let output = Command::new(command)
                        .args(args)
                        .output()
                        .map_err(|e| format!("Command execution failed: {}", e))?;
                    return Ok((
                        output.status.success(),
                        String::from_utf8_lossy(&output.stdout).to_string(),
                        String::from_utf8_lossy(&output.stderr).to_string(),
                    ));
                }

                // Trigger UAC via Start-Process -Verb RunAs
                let args_joined = args.join(" ");
                let script = format!(
                    "Start-Process -FilePath '{}' -ArgumentList '{}' -Verb RunAs -Wait -PassThru",
                    command, args_joined
                );

                let output = Command::new("powershell")
                    .args(["-NoProfile", "-NonInteractive", "-Command", &script])
                    .output()
                    .map_err(|e| format!("UAC prompt failed: {}", e))?;

                Ok((
                    output.status.success(),
                    String::from_utf8_lossy(&output.stdout).to_string(),
                    String::from_utf8_lossy(&output.stderr).to_string(),
                ))
            }
            _ => Err("Elevation is not supported on this operating system".to_string()),
        }
    }
}

pub fn is_elevated() -> bool {
    ElevationManager::is_elevated()
}

#[cfg(unix)]
unsafe fn libc_euid_zero() -> bool {
    extern "C" {
        fn geteuid() -> u32;
    }
    geteuid() == 0
}

#[cfg(not(unix))]
unsafe fn libc_euid_zero() -> bool {
    false
}
