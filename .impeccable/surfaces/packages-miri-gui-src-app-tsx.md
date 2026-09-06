---
version: 1
slug: "packages-miri-gui-src-app-tsx"
primary_target: "packages/miri-gui/src/App.tsx"
related_targets: []
---

# Surface Brief: Miri Cleaner Main GUI

<!-- impeccable:surface-brief-schema 1 -->

## Job and Audience
- **Primary Audience**: Casual users on Fedora & Windows who want safe, stress-free space recovery and speedups without feeling intimidated by terminal commands or complex settings; alongside Developers & Sysadmins who require granular control over DNF/Flatpak/WinGet caches, system services (Windows Update disabler, telemetry, journal vacuuming), container caches, and verified rollback snapshots.
- **Visitor Mode**: **Operate** (high scanability, rapid task completion, absolute safety transparency, tactile delight).

## Outcome and Proof
- **Primary Action**: Non-destructive Scan -> Review categorized space breakdown -> Safe Clean / Tweak execution backed by automatic pre-flight snapshots (Btrfs Snapper/Timeshift on Linux, System Restore / VSS on Windows).
- **Proof & Transparency**: Exact byte counters, live file locks detected (via /proc and Restart Manager), streaming progress logs, immutable safety audit journal (`audit.db` / `audit.json`), and one-click rollback.

## Selected Direction
- **Visual Identity**: Duolingo-inspired cheerful, tactile energy grounded by primary `#FF9D9D` (soft coral / strawberry milk), creamy warm backgrounds (`#FFF8F6` to `#FFFFFF`), chunky 3D-beveled action buttons, friendly progress indicators, paired with subtle retro pixel-art motifs (sparkle, broom, shield, dust bunny mascot) that add playfulness without hurting modern readability or typography.
- **Dual-Experience Topology**:
  - *Casual View*: High-level system health gauge, one-click "Safe Clean" button, friendly summary cards with simple toggles (e.g., "Trash & Temp Files", "Browser Caches").
  - *Power Inspector*: Granular tabs for Package Managers (DNF5 / WinGet / Flatpak), OS Tweaks (Windows Update 4-tier disabler, telemetry, systemd journal vacuuming), Dev Caches (Docker dangling images, Cargo, Go, npm/pnpm), and Rollback Checkpoints.
- **Safety Hardening**: Color-coded risk badges (`Safe`, `Moderate`, `Aggressive`, `Dangerous`). Destructive or system-critical operations require explicit modal confirmation with consequence preview and snapshot confirmation.

## Scope and Boundaries
- **In Scope**:
  - Rust Tauri v2 core application with separate packages for Fedora and Windows.
  - Cargo Workspace: `crates/miri-core` (scanners, rules, lock checker, snapshot runners, audit log), `packages/miri-gui` (Tauri v2 + React 19 + Tailwind + Zustand + TanStack Query), `crates/miri-cli` (optional Ratatui TUI and headless CLI).
  - Dry-run scanning engine with active process lock verification.
  - Windows 10/11 updates disabler (4-tier: services, GPO policies, task scheduler, metered network) with clean toggle and rollback.
  - Fedora Linux tools (DNF/DNF5 cache sweep, safe kernel pruning retaining N and N-1, systemd journal vacuum, Flatpak clean).
  - Safety checkpoints (Snapper/Timeshift detection on Linux, RestorePoint on Windows).
  - Polkit (Linux) and UAC (Windows) privilege separation.
- **Out of Scope / Anti-Goals**:
  - No opaque registry cleaners that delete unknown keys.
  - No running the main GUI directly as root or elevated administrator.
  - No pure pixel-art UI (the UI is modern, crisp, accessible typography with pixel accents and gamified tactile elements).

## States and Ranges
- **States**: Initial idle (ready to scan), Scanning (live radar scan, path animation, cancelable), Scanned (total bytes, category breakdowns, risk pills), Confirming Dangerous Action (modal dialog with snapshot confirmation), Executing (live stream log drawer, progress percentage), Success / Summary (mascot celebration, exact freed space, audit link), Rollback Review (list of historical snapshots with restore trigger).
- **Ranges**: Reclaimable space from 0 MB to 100+ GB; file counts from 0 to 500,000+ items.

## Interaction and Layout
- **Layout**: Left-hand navigation rail with chunky icons, top system status banner (OS, Btrfs/VSS snapshot readiness, privilege level), main scrollable workspace with responsive card grids, slide-out terminal drawer for live I/O log inspection.
- **Feedback & Motion**: Bouncy tactile button presses (active translate-y-1 with subtle drop-shadow), smooth expand/collapse drawers, clear status toasts.

## Constraints and Guardrails
- Hardcoded blocklists for critical OS directories (`/boot`, `/usr/bin`, `C:\Windows\System32`, etc.).
- Explicit prompt with type-to-confirm or slider for high-risk deletions.
- Offline-first execution: all scanning and cleaning runs locally without external network dependencies.
