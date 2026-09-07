---
version: 1
slug: "packages-miri-gui-src-app-tsx"
primary_target: "packages/miri-gui/src/App.tsx"
related_targets: []
---

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

## Direction contract

**THESIS**: A lesson-screen mindset, not a dashboard mindset -- one clear next action per screen with the mascot as the emotional anchor, refusing this category's default (a dense grid of equal-weight bordered cards competing for attention at once).

**OWN-WORLD**: Keep the established coral/mint/amber/sky tokens and Nunito type (already correct); shift the *arrangement*: fewer simultaneous modules per screen, one dominant focal card, capsule/pill-shaped primary buttons anchored prominently, generous padding scaled up from the current tight card grid, secondary data tucked behind expansion rather than always-visible.

**STORY**: The visitor feels coached by a companion (the horse mascot, shown large at key moments) toward one obvious next step, not presented with a control panel to interpret.

**FIRST VIEWPORT** (Casual dashboard): One hero module -- large horse mascot, single friendly headline, one big pill-shaped primary action -- with health/streak/digest consolidated into a single sequential focal story instead of three parallel cards, and the target list simplified to a scannable checklist.

**FORM**: User-pinned direction (named reference "Duolingo" plus explicit constraints: simplicity, whitespace, fun, reduced visual noise without losing expressiveness/detail, Advanced tab preserved). No concept-seed roll run -- the brief already named its own governing reference and constraints explicitly rather than leaving the direction open, so the seven-candidate exploration was skipped by design and disclosed as such. Code-led build (no image generation available in this environment).

**FINISH**: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Selected Direction
- **Visual Identity**: Duolingo-inspired cheerful, tactile energy grounded by primary `#FF9D9D` (soft coral / strawberry milk), creamy warm backgrounds (`#FFF8F6` to `#FFFFFF`), chunky 3D-beveled action buttons, friendly progress indicators, paired with a horse mascot (replacing the prior robot) rendered in the same flat-vector language as the existing pixel-badge/pixel-accent secondary elements.
- **Dual-Experience Topology**:
  - *Casual View*: Lesson-screen simplicity -- one focal module per screen, one primary pill-shaped action, mascot large and central at key moments (scan complete, clean complete, streak milestones).
  - *Power Inspector*: Preserved as the data-dense operator view (Package Managers, OS Tweaks, Dev Caches, Rollback Checkpoints) -- decluttered for consistency but not converted to lesson-screen grammar, since power users need density.
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
- **Layout**: Left-hand navigation rail with chunky icons, top system status banner (OS, Btrfs/VSS snapshot readiness, privilege level), main scrollable workspace, slide-out terminal drawer for live I/O log inspection.
- **Feedback & Motion**: Bouncy tactile button presses (active translate-y-1 with subtle drop-shadow), smooth expand/collapse drawers, clear status toasts.

## Constraints and Guardrails
- Hardcoded blocklists for critical OS directories (`/boot`, `/usr/bin`, `C:\Windows\System32`, etc.).
- Explicit prompt with type-to-confirm or slider for high-risk deletions.
- Offline-first execution: all scanning and cleaning runs locally without external network dependencies.
