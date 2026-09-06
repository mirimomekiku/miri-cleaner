# System Architecture & Application Specification

This application is an open-source, dual-interface system maintenance and debloating suite designed for Fedora/Linux distributions and Windows 10/11. It pairs an Electron desktop interface for casual and visual workflows with a headless/TUI CLI tool for power users, remote SSH administration, and automated CI/CD maintenance scripts.

---

## 1. Product Overview & Value Proposition

Most legacy system cleaners operate as opaque binaries with bundled adware, rigid cleaning targets, or risky registry erasers. This suite is built around transparency, non-destructive safety, and scriptability:

- **Unified Core Engine**: Both GUI and CLI tap into the exact same TypeScript core engine, guaranteeing identical scanning and cleaning results across both interfaces.
- **Non-Destructive Dry-Run Engine**: Every action evaluates targets first, calculating reclaimable bytes, verifying process file locks, and simulating changes without modifying the filesystem or system services.
- **Zero-Trust Privilege Separation**: The Electron interface never runs as an elevated administrator or root user. Only targeted, isolated helper workers are granted temporary elevation.
- **System Snapshot Verification**: No critical modification or deep system purge runs without first verifying or creating a snapshot (Windows System Restore / VSS on Windows; Snapper or Timeshift Btrfs/ZFS snapshots on Linux).

---

## 2. End-to-End System Architecture

The project is structured as a TypeScript monorepo with an unprivileged presentation tier and a secured, isolated system execution layer.

```text
┌────────────────────────────────────────┐   ┌────────────────────────────────────────┐
│             Electron GUI               │   │              Headless CLI              │
│       (React/Tailwind Renderer)        │   │       (Commander / Ink TUI / JSON)     │
└───────────────────┬────────────────────┘   └───────────────────┬────────────────────┘
                    │ IPC (contextBridge)                        │ Direct execution
                    ▼                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            Unprivileged Orchestration Layer                         │
│   • Rule Engine (YAML/JSON Manifests)      • File Scanner & Lock Checker            │
│   • Dry-Run Cost & Risk Estimator          • Rollback Log Generator                 │
└───────────────────────────────────┬─────────────────────────────────────────────────┘
                                    │ Elevation Bridge (IPC / stdio pipes)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           Privileged Execution Helper                               │
│  [Windows: Elevated Worker via UAC / RunAs]   [Linux: Worker spawned via Polkit/pkexec]│
└───────────────────┬────────────────────────────────────────────┬────────────────────┘
                    │                                            │
                    ▼                                            ▼
       ┌────────────────────────┐                   ┌────────────────────────┐
       │   Windows Subsystems   │                   │    Linux Subsystems    │
       │ • Win32 Registry API   │                   │ • DNF / DNF5 Library   │
       │ • Service Control Mgr  │                   │ • Systemd D-Bus API    │
       │ • Task Scheduler COM   │                   │ • Flatpak / Snap CLI   │
       │ • Volume Shadow Copy   │                   │ • Btrfs / Timeshift    │
       └────────────────────────┘                   └────────────────────────┘
```

---

## 3. How the Application Works (Lifecycle & Pipeline)

Every scan, clean, or system modification goes through a five-stage pipeline:

```text
[1. Target Ingestion] ──► [2. Inspection & Dry-Run] ──► [3. Safety Snapshot] ──► [4. Privileged Task Run] ──► [5. Audit Log]
```

### Stage 1: Manifest-Driven Target Ingestion

All cleaning rules and OS tweaks are defined in declarative schema manifests rather than hardcoded scripts:

- Each rule specifies OS constraints (`win32` vs `linux`), distro tags (`fedora`, `arch`, `debian`), elevation requirements (`user` vs `admin`), and risk levels (`safe`, `moderate`, `aggressive`).
- Users can define custom YAML manifests in `~/.config/cleaner/rules.d/` or `%APPDATA%\cleaner\rules.d\`.

### Stage 2: Inspection & Non-Destructive Scan

When a user clicks **Scan** or runs `cleaner scan`:

- The scanner walks configured paths using `lstat` to prevent following symlinks out of bounds.
- **Lock Verification**: On Windows, the engine invokes the Windows Restart Manager API (`RmGetList`) to see if an application holds an active handle on a temporary file. On Linux, it checks `/proc` file locks.
- The engine aggregates total bytes, file counts, and service states, emitting a detailed `ScanResult` object with zero destructive I/O.

### Stage 3: Snapshot & Safety Checkpoint

Before any file deletion or system modification executes:

- **On Windows**: Checks if System Restore is active on the system drive. If enabled, the core invokes WMI `Checkpoint-Computer -Description "Pre-Cleanup" -RestorePointType "MODIFY_SETTINGS"`.
- **On Linux (Fedora)**: Queries `snapper` or `timeshift` over D-Bus. If a Btrfs root volume is detected, it creates a read-only root snapshot (`snapper create -d "Pre-Cleanup"`).

### Stage 4: Execution & Privilege Escalation

If any task requires system administrator rights:

- **GUI Execution**: Electron's main process invokes an out-of-process Node.js helper binary. On Windows, it triggers a single UAC prompt via PowerShell's `Start-Process -Verb RunAs` or Windows API `ShellExecuteEx`. On Linux, it invokes the binary via Polkit's `pkexec` using a predefined policy file (`org.freedesktop.cleaner.policy`).
- **CLI Execution**: If run without `sudo` or elevation, the CLI either pauses with an interactive prompt or logs an elevation error when running non-interactively with `--json`.
- Tasks execute atomically, reporting live streaming progress (percentage, current path, error codes) back across stdout/IPC pipes.

### Stage 5: Verification & Rollback Logging

- Changes are written to a localized SQLite or JSON journal (`audit.db`).
- For registry or service tweaks, previous values are cached locally so running `cleaner rollback --last` or clicking **Undo Changes** restores the original system state without needing a full OS restore.

---

## 4. Deep-Dive: Core Feature Mechanisms

### Disabling Windows 10/11 Updates

Windows aggressively attempts to self-heal disabled update services through background orchestration and medic tasks. To permanently and reliably disable them, the helper executes a four-tiered policy:

```text
                  ┌──────────────────────────────────────────────┐
                  │          Disable Windows Updates             │
                  └──────────────────────┬───────────────────────┘
                                         │
       ┌──────────────────┬──────────────┴─────┬─────────────────┐
       ▼                  ▼                    ▼                 ▼
 1. Service Locks   2. Policy Override    3. Task Disabling   4. Network Shield
  • Stop & set to    • Set AUOptions = 2   • Disable all tasks • Mark default
    Disabled:          (Notify only)         in TaskScheduler:   interfaces as
    - wuauserv       • Set NoAutoUpdate    - \WindowsUpdate\*    "Metered"
    - WaaSMedicSvc     = 1                 - \WaaSMedic\*
    - UsoSvc         • Enforce in GPO      - \UpdateOrchestrator\*
    - DoSvc            registry paths
```

- **Rollback Mechanism**: The application caches the original service startup states (`Manual`, `Automatic (Delayed)`) and original registry settings, restoring them cleanly when toggled off.

### Fedora & Linux Distribution Maintenance

- **DNF / DNF5 Package Cache**: Interacts with the package manager directly, running `dnf clean all` and pruning unneeded build artifacts and downloaded RPM headers.
- **Kernel Lifecycle Management**: Queries RPM DB for installed packages with `installonlypkgs`. It parses the currently running kernel version via `uname -r`, ensures the current and N-1 fallback kernels remain untouched, and calls `dnf remove` for obsolete builds.
- **Systemd Journal Vacuuming**: Targets the systemd journal database without corrupting active logs by invoking `journalctl --vacuum-time=7d` and `journalctl --vacuum-size=200M`.
- **Container Runtimes**: Sweeps Flatpak by invoking `flatpak uninstall --unused -y` and purging dangling files in `~/.var/app/*/cache`.

### Developer Environment Cleanup

- **Node Ecosystem**: Clears orphaned caches across `~/.npm`, `~/.yarn/cache`, and global `pnpm-store` references.
- **Container Caches**: Interacts with the local Docker daemon socket (`/var/run/docker.sock` or Windows named pipe `//./pipe/docker_engine`) to purge untagged dangling images (`docker image prune -f`).
- **Compilers & Toolchains**: Cleans Rust Cargo temporary build targets (`~/.cargo/registry/cache`) and Go build caches (`go clean -cache`).

---

## 5. User Interface & User Experience (GUI vs CLI)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Cleaner Suite                                                  [—] [□] [✕] │
├──────────────────┬──────────────────────────────────────────────────────────┤
│ ❖ Dashboard      │ System Health: Good (Fedora 40 / Linux 6.8)              │
│ 🧹 System Clean  │ Total Reclaimable Space: 14.8 GB                         │
│ 🛠 Windows Tweaks│ ──────────────────────────────────────────────────────── │
│ 📦 Dev Caches    │ [☑] System Package Cache (DNF)                  4.2 GB   │
│ ⚙ Settings       │ [☑] Systemd Journal Logs (older than 7 days)   850.0 MB   │
│                  │ [☑] Web Browser Caches (Chrome, Firefox)        2.1 GB   │
│                  │ [☐] Old Linux Kernels (2 unused found)          1.4 GB   │
│                  │ [☑] Docker Dangling Images                      6.2 GB   │
│                  │ ──────────────────────────────────────────────────────── │
│                  │ [  Run Dry-Scan  ]                 [  Clean 13.4 GB  ]   │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

- **Dashboard View**: Shows aggregate system drive capacity, last cleanup timestamp, and toggleable categories.
- **Live Activity Drawer**: Slides open during operations to show a terminal-like log stream detailing which specific file or registry key is being handled.
- **CLI Parity**: Every UI interaction maps 1:1 with a command-line flag:
  - Running a dry-run:
    ```bash
    cleaner scan --category dev-cache,packages
    ```
  - Applying tweaks:
    ```bash
    cleaner tweak windows-update --state disable
    ```
  - Headless output:
    ```bash
    cleaner scan --format json | jq '.totalReclaimableBytes'
    ```

---

## 6. Safety & Security Guardrails

| Risk Vector                               | Built-In Safeguard                                                                                                                                                              |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Symlink Attacks / Directory Traversal** | The walker uses Node's `fs.lstat` and explicitly refuses to recurse if a directory is a symbolic link or external reparse point.                                                |
| **GUI Compromise via Renderer**           | Context isolation is enforced. Web preferences disable `nodeIntegration`. The renderer interacts solely through typed channels exposed via `contextBridge`.                     |
| **Deleting Critical System Files**        | A hardcoded, immutable blocklist explicitly prohibits matching or recursing into critical paths (e.g., `/boot`, `/etc`, `/usr/bin`, `C:\Windows\System32`, `C:\Program Files`). |
| **Partial / Interrupted Operations**      | Deletion queues process files individually with `try`/`catch` handlers. If an I/O lock is encountered, the item is recorded as skipped rather than failing the entire batch.    |

---

## 7. Execution & Running the Application

### Native Desktop Application (Electron)

```bash
# Launch the native desktop application (builds renderer & launches Electron window)
npm run app
# or
npm run dev
# or directly
npm run electron
```

### Headless CLI & TUI

```bash
# Run interactive TUI scanner
npm run tui

# Run quick non-destructive scan
npm run scan

# Run dry-run cleanup simulation
npm run clean

# Apply tweaks or rollback last session
npm run tweak
npm run rollback
```
