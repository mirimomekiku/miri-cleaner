# Miri Cleaner

[![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg)](https://www.rust-lang.org)
[![Tauri](https://img.shields.io/badge/Tauri-v2-blue.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com)
[![Brand Color](https://img.shields.io/badge/%23FF9D9D-Coral%20Pink-ff9d9d.svg)](#)
[![Latest Release](https://img.shields.io/github/v/release/mirimomekiku/miri-cleaner.svg)](https://github.com/mirimomekiku/miri-cleaner/releases/latest)

**Miri Cleaner** is an open-source, dual-interface system maintenance and debloating suite designed for **Fedora / Linux** and **Windows 10/11**.

Prebuilt installers (Fedora `.rpm`, Debian/Ubuntu `.deb`, portable `.AppImage`, Windows `.msi`/`.exe`) are published on the [Releases page](https://github.com/mirimomekiku/miri-cleaner/releases/latest) for every tagged version.

It combines a **Duolingo-inspired playful desktop GUI** (`#FF9D9D` coral theme, a horse mascot, chunky pill-shaped tactile buttons, and one clear focal action per screen) for casual and visual workflows with a **headless CLI & Ratatui TUI** for power users, remote SSH administration, and scripts.

---

## Key Features

- **Zero-Trust Safety & Privilege Separation**: The desktop application runs as an unprivileged user process. Isolated helpers request temporary escalation via Polkit (`pkexec`) on Linux and UAC (`RunAs`) on Windows only when strictly necessary.
- **Safety Checkpoint & Snapshot Verification**: Critical system purges and tweaks verify or trigger a pre-cleanup snapshot before touching system files (Snapper / Timeshift on Btrfs Linux, Volume Shadow Copy / System Restore on Windows), with a working one-tap rollback per audit entry.
- **Non-Destructive Dry-Run Scanner**: Recursively inspects candidate paths with `lstat` to prevent following symlinks out of bounds. Checks active process file locks (`/proc` on Linux and Restart Manager on Windows) before flagging any item, and previews exactly which paths and file counts a clean will touch before you confirm it.
- **Permission & Danger Hardening**: Dangerous tasks (kernel pruning, registry policies, service locks) are guarded behind explicit confirmation modals with consequence explanations and safety verification gates.
- **Windows 10/11 Update Profiles & Tweaks Suite**:
  1. **Recommended Profile**: Defers feature updates 365 days, quality updates 4 days, excludes drivers, prevents active reboot.
  2. **Windows Default**: Restores stock update services, scheduled tasks, and GPO policies.
  3. **Disable Updates (4-Tier Policy)**:
     - **Service Locks**: Stops and sets startup to Disabled for `wuauserv`, `WaaSMedicSvc`, `UsoSvc`, `DoSvc`.
     - **GPO Registry Policies**: Enforces `AUOptions = 2` (Notify only) and `NoAutoUpdate = 1`.
     - **Task Scheduler**: Disables self-healing maintenance tasks in `\WindowsUpdate`, `\WaaSMedic`, `\UpdateOrchestrator`.
     - **Metered Network Shield & Cache Purge**: Clears `SoftwareDistribution\Download` and sets network shield.
  - Plus SysMain/Superfetch disable, the NetworkThrottlingIndex packet-cap removal, Hardware-Accelerated GPU Scheduling, mouse acceleration disable, the Ultimate Performance power plan, Search-indexing disable, Fast Startup disable (dual-boot-safe, distinct from full hibernation), Game Bar/DVR disable, Bing/web-results-in-Start-search disable, and USB selective-suspend disable.
- **Fedora & Linux Maintenance Suite**:
  - DNF / DNF5 package cache cleaning (`dnf clean all`).
  - Safe kernel lifecycle management (parses `uname -r`, strictly preserves running + N-1 fallback kernels, flags obsolete builds).
  - Systemd journal vacuuming (`journalctl --vacuum-time=7d --vacuum-size=200M`).
  - Flatpak unused runtime sweep (`flatpak uninstall --unused -y`).
  - Plus swappiness/dirty-ratio kernel tuning, an inotify watch-limit increase, earlyoom, `fstrim.timer`, Bluetooth/CUPS/Avahi disable, Feral GameMode install, and a power-profile performance switch.
- **Developer Toolchain Sweeps**:
  - Docker untagged dangling images (`docker image prune -f`).
  - Rust Cargo build registry caches (`~/.cargo/registry/cache`).
  - Go build caches (`go clean -cache`).
  - Node.js global caches (`~/.npm/_cacache`, `~/.yarn/cache`, `pnpm store prune`).
- **Audit & Rollback Journal**: All actions are logged to `audit.json` with snapshot references and undo payloads. The desktop GUI's Safety & Vitals tab surfaces this journal directly, with a working one-tap rollback per entry.

---

## Desktop GUI Highlights

Beyond the core cleanup engine, the Tauri/React desktop app adds a few things worth calling out:

- **A lesson-screen dashboard, not a control panel**: one dominant focal card per screen, the horse mascot large at key moments, one obvious pill-shaped primary action, and secondary detail tucked behind an expand toggle instead of everything competing for attention at once.
- **Cleaning streaks & garden growth**: a daily streak tracker with a tiered garden visualization and milestone badges for streak length and cumulative space freed.
- **Smart Clean**: a guided wizard that ranks safe targets by size, folds in any removable orphaned app leftovers, and cleans them in one pass.
- **Weekly digest**: a once-a-week summary of what was actually freed, how many cleanups ran, and how many safety snapshots were registered — computed from the real audit journal, not a claim.
- **Usage-based uninstall suggestions**: flags installed apps you haven't opened in 90+ days, with the space they'd reclaim.
- **Boot impact scoring**: surfaces enabled startup apps with an estimated boot-time cost and a one-tap toggle.
- **Battery health trend**: a small sparkline tracking battery health over time on laptops (nothing shown on battery-less desktops).
- **Branded splash + first-run onboarding**: a brief animated splash on launch, followed (once, on first run) by a skippable step-by-step orientation explaining what a dry-run scan is, what the automatic safety snapshot does, and where rollback lives.
- **Resilient error surfacing**: every scan/clean/tweak/rollback action shows a visible on-brand error banner with Retry on failure, instead of only logging to the activity console.
- **Dynamic, locale-aware byte formatting**: sizes are never hardcoded to one unit — a 107 KB cache and a 35 GB toolchain store each render in the unit that actually fits.
- **Pixel-themed loading states**: skeleton placeholders use a coral-tinted, stepped shimmer with restrained pixel-dust corner accents, matching the app's retro-tactile visual language.
- **On-brand activity console**: the slide-up log drawer color-codes events by severity, supports filtering and copy-all, and matches the rest of the tactile design system instead of looking like a bolted-on terminal.

---

## Monorepo Architecture

```
miri-cleaner/
├── crates/
│   ├── miri-core/           # Shared Rust engine (scanners, rules, snapshots, elevation, audit)
│   └── miri-cli/            # Headless CLI and Ratatui interactive TUI
├── packages/
│   └── miri-gui/            # Tauri v2 + React 19 + Tailwind desktop application
│       └── src-tauri/       # Tauri native backend invoking miri-core
└── packaging/
    ├── fedora/              # RPM .spec, Polkit action policy, Desktop launcher, build script
    └── windows/             # NSIS installer, app UAC manifest, PowerShell build script
```

---

## Getting Started

### Prerequisites
- **Rust** 1.80+ (`cargo`, `rustc`)
- **Node.js** 20+ & `npm`
- Linux: `pkg-config`, `polkit` (optional: `snapper` or `timeshift`)
- Windows: PowerShell 5.1+

### Running the Desktop GUI (Tauri / React)

```bash
cd packages/miri-gui
npm install

# Run in web preview mode (with simulated IPC bridge):
npm run dev

# Run native Tauri desktop window:
npm run tauri dev
```

### Running the TUI & Headless CLI

```bash
# Launch the interactive terminal UI (TUI):
cargo run -p miri-cli -- tui

# Run non-destructive inspection:
cargo run -p miri-cli -- scan

# Inspect output in JSON format:
cargo run -p miri-cli -- scan --json

# Run dry-run simulation:
cargo run -p miri-cli -- clean --dry-run

# Apply Windows Update 4-Tier disabler or restore:
cargo run -p miri-cli -- tweak windows-update --state disable
cargo run -p miri-cli -- tweak windows-update --state restore

# Prune DNF package cache on Fedora:
cargo run -p miri-cli -- tweak dnf-cache

# Vacuum systemd journals:
cargo run -p miri-cli -- tweak journal-vacuum

# Clean developer toolchains:
cargo run -p miri-cli -- dev-cache --all

# View rollback journal:
cargo run -p miri-cli -- rollback
```

---

## Packaging

### Fedora Linux (RPM)
```bash
./packaging/fedora/build-rpm.sh
```
This packages the `miri-cleaner` binary, installs the Polkit policy (`org.freedesktop.miri-cleaner.policy`) into `/usr/share/polkit-1/actions/`, and registers the desktop launcher.

### Windows 10/11 (MSI / NSIS)
```powershell
powershell -ExecutionPolicy Bypass -File .\packaging\windows\build-windows.ps1
```
This builds the release binary, bundles the React frontend, and creates the NSIS installer and application manifest with `asInvoker` zero-trust privileges.

---

## Safety Blocklist Guardrails

The core scanner strictly refuses to delete or recurse into critical operating system directories:
- **Linux**: `/boot`, `/etc`, `/usr/bin`, `/usr/lib`, `/bin`, `/sbin`, `/lib`, `/dev`, `/proc`, `/sys`, `/`
- **Windows**: `C:\Windows\System32`, `C:\Windows\SysWOW64`, `C:\Windows\WinSxS`, `C:\Program Files`, `C:\Program Files (x86)`
- **Symlinks**: Symlinks are never followed out of bounds during deletion.

---

## Quick Shell & PowerShell Commands

Both universal runners (`./miri.sh` / `.\miri.ps1`) and dedicated single-command scripts in `scripts/` are provided for instant one-line execution.

### Master Runner

| Action | Linux / macOS (`bash`) | Windows (`PowerShell`) |
| :--- | :--- | :--- |
| **Interactive Menu** | `./miri.sh` | `.\miri.ps1` |
| **Launch Desktop GUI** | `./miri.sh gui` | `.\miri.ps1 gui` |
| **Launch Terminal TUI** | `./miri.sh tui` | `.\miri.ps1 tui` |
| **Non-Destructive Scan** | `./miri.sh scan` | `.\miri.ps1 scan` |
| **Simulated Dry-Run Clean** | `./miri.sh clean-dry` | `.\miri.ps1 clean-dry` |
| **Execute Safe Clean** | `./miri.sh clean` | `.\miri.ps1 clean` |
| **Disable Windows Updates** | `./miri.sh tweak windows-update --state disable` | `.\miri.ps1 tweak windows-update --state disable` |
| **Restore Windows Updates** | `./miri.sh tweak windows-update --state restore` | `.\miri.ps1 tweak windows-update --state restore` |
| **Prune Fedora DNF Cache** | `./miri.sh tweak dnf-cache` | N/A |
| **Vacuum Systemd Journal** | `./miri.sh tweak journal-vacuum` | N/A |
| **Prune Dev Toolchains** | `./miri.sh dev-cache --all` | `.\miri.ps1 dev-cache --all` |
| **View Audit / Rollback** | `./miri.sh rollback` | `.\miri.ps1 rollback` |
| **Run Unit Tests** | `./miri.sh test` | `.\miri.ps1 test` |
| **Build Package (RPM/MSI)** | `./miri.sh package` | `.\miri.ps1 package` |

### Dedicated Single-Command Scripts (`scripts/`)

- `scripts/gui.sh` / `scripts/gui.ps1`
- `scripts/tui.sh` / `scripts/tui.ps1`
- `scripts/scan.sh` / `scripts/scan.ps1`
- `scripts/clean.sh` / `scripts/clean.ps1`
- `scripts/clean-dry-run.sh` / `scripts/clean-dry-run.ps1`
- `scripts/tweak.sh` / `scripts/tweak.ps1`
- `scripts/dev-cache.sh` / `scripts/dev-cache.ps1`
- `scripts/rollback.sh` / `scripts/rollback.ps1`
- `scripts/test.sh` / `scripts/test.ps1`
- `scripts/package.sh` / `scripts/package.ps1`
