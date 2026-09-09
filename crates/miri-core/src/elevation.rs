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
                Self::run_elevated_windows(command, args)
            }
            _ => Err("Elevation is not supported on this operating system".to_string()),
        }
    }

    /// Elevates via UAC (`Start-Process -Verb RunAs`) and reports back what
    /// the *elevated* process actually did.
    ///
    /// The previous implementation had two independent bugs: (1) it joined
    /// `command`/`args` into a single string and re-embedded it inside a
    /// second, single-quoted `-ArgumentList '...'` PowerShell string --
    /// every real Windows tweak script contains its own single-quoted
    /// literals (e.g. `@('wuauserv', 'WaaSMedicSvc')`), which closes that
    /// outer quote early and corrupts the command; and (2) `-Verb RunAs`
    /// requires `ShellExecute`, which Windows does not allow combined with
    /// redirected stdio, so the captured "stdout" was always empty and the
    /// returned success flag reflected only the unelevated *launcher*
    /// process, not the elevated command -- a failed elevated action could
    /// silently report `succeeded: true`.
    ///
    /// This version writes the real script to its own temp `.ps1` file (so
    /// its quoting never has to survive a second layer of string escaping)
    /// and has that script itself record its output and outcome to temp
    /// files, which are read back after the elevated process exits --
    /// sidestepping the ShellExecute/redirection limitation instead of
    /// fighting it.
    fn run_elevated_windows(command: &str, args: &[&str]) -> Result<(bool, String, String), String> {
        let inner_script = if command.eq_ignore_ascii_case("powershell")
            && args.len() >= 3
            && args[args.len() - 2] == "-Command"
        {
            // The shape every real caller uses: ["-NoProfile", "-Command", script].
            args[args.len() - 1].to_string()
        } else {
            // No other shape occurs today, but degrade gracefully rather
            // than panic if one ever does: run the given program with its
            // arguments as a single external-command invocation.
            let quoted_args: Vec<String> = args.iter().map(|a| Self::ps_single_quote(a)).collect();
            format!("& {} {}", Self::ps_single_quote(command), quoted_args.join(" "))
        };

        let temp_dir = std::env::temp_dir();
        let id = std::process::id();
        let nonce = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let script_path = temp_dir.join(format!("miri-cleaner-elevate-{id}-{nonce}.ps1"));
        let stdout_path = temp_dir.join(format!("miri-cleaner-elevate-{id}-{nonce}.out"));
        let exit_path = temp_dir.join(format!("miri-cleaner-elevate-{id}-{nonce}.exit"));

        let wrapped_script = format!(
            "$ErrorActionPreference = 'Continue'\ntry {{\n    $output = & {{\n{inner_script}\n    }} 2>&1 | Out-String\n    $exitCode = 0\n}} catch {{\n    $output = $_.Exception.Message\n    $exitCode = 1\n}}\n[IO.File]::WriteAllText({}, [string]$output)\n[IO.File]::WriteAllText({}, [string]$exitCode)\n",
            Self::ps_single_quote(&stdout_path.to_string_lossy()),
            Self::ps_single_quote(&exit_path.to_string_lossy()),
        );
        std::fs::write(&script_path, wrapped_script)
            .map_err(|e| format!("Failed to stage elevated script: {e}"))?;

        let launcher = format!(
            "Start-Process -FilePath 'powershell' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',{} -Verb RunAs -Wait",
            Self::ps_single_quote(&script_path.to_string_lossy()),
        );

        // This launcher process itself never elevates; it only requests
        // elevation for the child and waits. Its own exit status says
        // nothing about the elevated script's outcome -- that comes from
        // the files the elevated script wrote, read below.
        let launch = Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &launcher])
            .output();

        let stdout_content = std::fs::read_to_string(&stdout_path).ok();
        let exit_content = std::fs::read_to_string(&exit_path).ok();

        let _ = std::fs::remove_file(&script_path);
        let _ = std::fs::remove_file(&stdout_path);
        let _ = std::fs::remove_file(&exit_path);

        match exit_content.and_then(|s| s.trim().parse::<i32>().ok()) {
            Some(code) => Ok((code == 0, stdout_content.unwrap_or_default(), String::new())),
            None => {
                // The elevated script never ran at all: the UAC prompt was
                // declined, or the launcher itself failed to start it.
                let launch_err = match launch {
                    Ok(o) if !o.status.success() => String::from_utf8_lossy(&o.stderr).to_string(),
                    Err(e) => e.to_string(),
                    _ => String::new(),
                };
                Err(format!(
                    "Administrator permission was not granted, or the elevated command failed to start.{}",
                    if launch_err.trim().is_empty() { String::new() } else { format!(" ({launch_err})") }
                ))
            }
        }
    }

    /// Wraps a string in single quotes for embedding as a PowerShell string
    /// literal, doubling any embedded single quote per PowerShell's escape
    /// rule (`'it''s'` -> `it's`) -- the single quoting primitive every
    /// value inserted into a generated PowerShell command must go through.
    fn ps_single_quote(s: &str) -> String {
        format!("'{}'", s.replace('\'', "''"))
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
