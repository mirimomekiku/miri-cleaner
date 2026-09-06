# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

Tauri v2 (Rust core engine & native bindings) + React 19 + TypeScript + Vite + Tailwind CSS + Zustand (state) + TanStack Query (async scans/checks) + Zod (schema validation) + Lucide Icons + optional Ratatui (Rust TUI CLI). Cargo Workspace monorepo containing `miri-core`, `miri-gui` (Tauri), and `miri-cli` (TUI/headless).

## Users

- **Casual Users (Fedora & Windows)**: Want a fast, cute, reassuring, and stress-free way to free up gigabytes of disk space and optimize system speed without technical jargon or fear of corrupting their system.
- **Power Users / Developers / Sysadmins**: Need precise inspection of package caches (DNF, Flatpak, WinGet), system services (Windows Update control, telemetry, systemd journal vacuuming), developer toolchains (Docker, Cargo, Go, npm/pnpm), with dry-run verification, safety snapshots, and rollback journals.

## Product Purpose

Miri Cleaner turns stressful, opaque, and dangerous OS maintenance into an approachable, transparent, and delight-filled experience. It delivers zero-trust safety: non-destructive dry-run scans, automatic safety snapshots (Btrfs/Snapper/Timeshift on Linux, System Restore / VSS on Windows), explicit confirmation gates on dangerous tasks, and a complete undo/rollback journal.

## Positioning

Unlike CCleaner or sketchy system tweakers that install adware and blindly purge registry keys, and unlike purely spartan terminal scripts, Miri Cleaner combines a Duolingo-inspired friendly aesthetic with a robust, memory-safe Rust core engine, verifiable dry-run calculations, process lock detection, and strict privilege separation.

## Operating Context

- **Operating Systems**: Fedora Linux (DNF5/Btrfs/systemd/Polkit) and Windows 10/11 (PowerShell/UAC/Registry/VSS/Services).
- **Environments**: Native desktop graphical application (primary) and headless/interactive terminal CLI/TUI (secondary/optional for SSH and scripts).
- **Execution Model**: Runs unprivileged by default; requests temporary privilege escalation (pkexec / UAC) only for tasks that strictly require root/administrator privileges.

## Capabilities and Constraints

- **Non-Destructive Dry-Run**: Every clean or tweak evaluates targets first, verifying file locks (/proc on Linux, Restart Manager on Windows) and calculating exact reclaimable bytes without destructive I/O.
- **Safety Snapshots**: Enforces pre-execution checkpoints (Snapper/Timeshift on Btrfs Linux, VSS/RestorePoint on Windows).
- **Permission & Danger Hardening**: Dangerous tasks (kernel purges, registry overrides, service locks) feature explicit modal warnings, granular permission prompts, and confirmation gates.
- **Windows Updates Disabling**: Multi-layered management (Service locks on wuauserv, WaaSMedicSvc, UsoSvc, DoSvc; GPO registry policies; scheduled task disabling; metered network flags) with exact rollback states.
- **Fedora/Linux Maintenance**: DNF/DNF5 cache pruning, safe unused kernel pruning (preserving running & fallback kernels), systemd journal vacuuming, Flatpak unused runtimes removal.
- **Developer Caches**: Docker dangling image prunes, Cargo/Go build caches, npm/yarn/pnpm global stores.
- **Separate Packaging**: Target-specific packages for Fedora (RPM / binary) and Windows (MSI / EXE installer).

## Brand Commitments

- **Name**: Miri Cleaner (or miri-cleaner).
- **Visual Personality**: Duolingo-like playful charm, cheerful encouragement, friendly mascot energy, chunky tactile rounded buttons with subtle 3D depth, coupled with tasteful pixel-art accents (retro clean-up vibes, broom/sparkle/shield pixel badges).
- **Primary Brand Color**: #FF9D9D (warm pastel coral/strawberry pink) supported by rich cream, soft slate, mint green (success/safe), and amber/crimson (danger/warning).
- **Tone**: Reassuring, crystal clear, friendly, and never condescending. Serious about system safety, joyful about freeing space.

## Evidence on Hand

- `APP.md`: Detailed system architecture, 5-stage lifecycle pipeline, privilege separation model, Windows update 4-tier policy, and safety guardrails.
- Upstream reference designs: Standard tested PowerShell and bash optimization patterns.

## Product Principles

1. **Safety Over Speed**: Never delete a file or modify a service unless verified, dry-run simulated, and backed by a snapshot or rollback journal.
2. **Playful Simplicity, Uncompromised Power**: Casual users get cheerful, one-click clarity; power users can peel back the curtain to inspect every byte, command, and switch.
3. **Zero-Trust Privilege Separation**: The UI never runs elevated; only isolated execution helpers request temporary privilege when strictly necessary.
4. **No Destructive Surprises**: Clear, unmistakable confirmation prompts for dangerous operations; transparent dry-run reporting.
5. **Rock-Solid Portability**: Native feel and proper platform idioms on both Fedora Linux and Windows 10/11.

## Accessibility & Inclusion

- High contrast text against pastel backgrounds (meeting WCAG AA standards).
- Full keyboard navigability across both GUI and CLI/TUI.
- Clear icon + text labels for color-blind accessibility (never relying on color alone for safety status).
