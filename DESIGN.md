---
name: Miri Cleaner
description: Playful Duolingo-tactile system optimizer with zero-trust safety guardrails and subtle pixel accents
colors:
  primary: "#FF9D9D"
  primary-hover: "#FF7B7B"
  primary-border: "#E05B5B"
  success-mint: "#58CC02"
  warning-amber: "#FFC800"
  danger-red: "#FF4B4B"
  info-blue: "#1CB0F6"
  neutral-bg: "#FFF9F8"
  neutral-surface: "#FFFFFF"
  neutral-text: "#2D2327"
  neutral-muted: "#8A7D84"
  neutral-border: "#F1E4E2"
typography:
  display:
    fontFamily: "Nunito, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 900
    lineHeight: 1.15
  headline:
    fontFamily: "Nunito, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.3
  body:
    fontFamily: "Nunito, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
  label:
    fontFamily: "'Press Start 2P', monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    lineHeight: 1.2
rounded:
  sm: "8px"
  md: "16px"
  lg: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-success:
    backgroundColor: "{colors.success-mint}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  card-duo:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Miri Cleaner

## Overview

**Creative North Star: "The Friendly Robo-Gardener"**

Miri Cleaner reimagines system maintenance not as a grim, anxiety-ridden diagnostic suite, but as a joyful, reassuring morning routine. Inspired by Duolingo's tactile gamification and warm playfulness, the visual world balances welcoming curves and 3D-pressed buttons with serious zero-trust safety mechanisms.

Subtle retro pixel-art badges (broom, sparkles, shields, and dust mascots) introduce playful character without compromising typography, contrast, or information density. Casual users are greeted with high-level clarity and immediate reassurance; power users can seamlessly toggle the view to inspect every byte, command line, and process lock.

**Key Characteristics:**
- Warm coral pink `#FF9D9D` anchor with cream-paper background `#FFF9F8`.
- Duolingo-styled 3D tactile buttons that physically sink on press with thick bottom borders (`shadow-[0_4px_0_0_#E05B5B]`).
- Reassuring safety status pills and explicit confirmation modals for dangerous tasks.
- Restrained pixel-art accents strictly confined to status badges, score counters, and mascots.
- Coherent, consistent iconography strictly powered by Lucide icons across all views.

## Colors

A warm, pastel-forward palette engineered to lower user stress while maintaining strict WCAG AA contrast against white and cream grounds.

### Primary
- **Miri Coral** (`#FF9D9D`): Dominant brand color, used on primary call-to-action buttons, active navigation states, and brand banners.
- **Coral Hover** (`#FF7B7B`): Interactive state for brand actions.
- **Deep Coral Shadow** (`#E05B5B`): Bottom border shadow for 3D button press depth.

### Secondary & Semantic
- **Duolingo Mint** (`#58CC02`): Represents safe, non-destructive status, verified Btrfs/VSS snapshots, and completed cleanups.
- **Alert Crimson** (`#FF4B4B` / `#EF4444`): Reserved exclusively for dangerous operations (kernel removals, registry edits) and security gates.
- **Sparkle Yellow** (`#FFC800`): Health gauge scores, celebratory confetti, and notification highlights.
- **Deep Sky Blue** (`#1CB0F6`): Developer toolchains, build caches, and storage treemap category blocks.

### Neutral
- **Cream Ground** (`#FFF9F8`): The primary application canvas background.
- **Clean Card White** (`#FFFFFF`): Foreground surface for cards, modals, and sidebar.
- **Deep Slate Text** (`#2D2327` / `#1E293B`): High-contrast primary copy color.
- **Muted Slate Text** (`#64748B` / `#8A7D84`): Secondary descriptions, file paths, and telemetry metadata.
- **Soft Border** (`#F1E4E2` / `#E2E8F0`): Outer boundary for cards, tables, and tab groups.

### Named Rules
**The Green-Means-Guaranteed Rule.** The mint color is used solely when a target has been verified non-destructive and backed by an active snapshot (Snapper / VSS). Never use green for unverified states.

**The Contrast Floor Rule.** Never use gray or muted text on colored backgrounds. Colored badges must use high-contrast tint pairings (e.g. `bg-indigo-100 text-indigo-900` or `bg-slate-200 text-slate-900`).

## Typography

**Display Font:** Nunito (900 Black)
**Body Font:** Nunito (600 SemiBold & 700 Bold)
**Accent / Pixel Font:** "Press Start 2P" (monospace)

### Hierarchy
- **Display** (weight: 900, size: `clamp(1.75rem, 4vw, 2.25rem)`, line-height: 1.15): Hero titles, health gauge headlines.
- **Headline** (weight: 800, size: 1.25rem, line-height: 1.3): Card headers, modal titles.
- **Body** (weight: 600, size: 0.875rem, line-height: 1.5): Descriptive target copy and system instructions.
- **Label / Pixel** (weight: 400, font: Press Start 2P, size: 0.625rem, line-height: 1.2): Version tags, risk indicators, metric units.

### Named Rules
**The Legibility-First Rule.** Retro pixel fonts are strictly prohibited for body text, path strings, and warning descriptions. Pixel styling is only permitted on mini-badges, units, and mascot emotes.

**The Dynamic-Unit Rule.** Every on-screen byte count renders through the shared `formatBytes()` utility (`lib/formatters.ts`), which auto-selects B/KB/MB/GB/TB/PB and scales decimal precision to the unit. Never hand-roll `(bytes / (1024*1024)).toFixed(1) + " MB"` — a 107MB package cache and a 35.8GB toolchain store sitting side by side each need the unit that actually fits their scale.

## Layout

- Fixed left navigation rail (icon-only at `w-16`, icon+label from `lg:w-64`) with chunky rounded pills and Lucide icons.
- Top status header providing persistent awareness of active OS, snapshot provider, and privilege elevation; below `sm` it collapses to brand mark + icon-only mode toggle so no control is ever clipped off-screen.
- Fluid responsive main stage with responsive 2-column card grid (`grid-cols-1 md:grid-cols-2`).
- Hero banners (mascot + heading + metric pill) stack to a single full-width column below `md` and truncate long headings with ellipsis rather than overflowing the viewport.
- Slide-up bottom terminal drawer (height: `h-64`) with auto-scroll for streaming process inspection and zero-trust verification.
- Proportional Category Bar (`Space X-Ray`) scaling flex blocks across file classes (Caches, Media, Archives, Documents, Other).

### Named Rules (optional)
**The Bounded-Width Rule.** Any flex row nested inside a `flex-col`/`md:flex-row` responsive container gets an explicit `w-full md:w-auto min-w-0` so text truncation and wrapping have a real width to measure against; omitting it lets content silently overflow past the viewport instead of degrading gracefully.

## Elevation & Depth

Surfaces utilize physical 3D bevels and tonal layering rather than blurry realistic drop shadows.

### Shadow Vocabulary
- **Duolingo 3D Button** (`box-shadow: 0 4px 0 0 rgba(0,0,0,0.12)`, `border-bottom: 4px`): Used on all tactile interactive buttons. Translates down by 2-3px on click.
- **Card Surface** (`box-shadow: 0 4px 0 0 rgba(0,0,0,0.06)`, `border: 2px solid #F1E4E2`): Floating rounded card layer.
- **Pixel Shadow** (`box-shadow: 2px 2px 0 0 #2D2327`): Used on pixel badges for sharp retro contrast.

### Named Rules
**The Physical-Press Rule.** Every tactile button has an active state that reduces its bottom shadow and translates the container downward, simulating a mechanical keypress.

## Shapes

- Chunky rounded corners: `rounded-3xl` (24px) for cards, modals, and containers; `rounded-2xl` (16px) for tactile buttons.
- Thick 2px outer borders providing distinct, playful definition without harshness.

## Components

### Tactile Buttons
- **Shape:** 16px radius (`rounded-2xl`) with 4px bottom border shadow.
- **Primary:** Coral background `#FF9D9D`, dark slate text `#2D2327`, `#E05B5B` bottom border.
- **Success:** Mint background `#58CC02`, white text, `#047857` bottom border.
- **Secondary:** White background, slate border `#E2E8F0`, `#CBD5E1` bottom shadow.
- **Danger:** Red background `#EF4444`, white text, `#B91C1C` bottom border.
- **Active State:** Translates down by 2-3px with reduced shadow to simulate a physical push-button.

### Cards & Container Tiles
- **Corner Style:** 24px radius (`rounded-3xl`).
- **Background:** Crisp white `#FFFFFF` over cream ground `#FFF9F8`.
- **Border:** 2px solid `#F1E4E2` shifting to coral `#FFB8B8` on hover/active.

### Hardened Danger Modal
- **Border:** 4px solid `#FF4B4B`.
- **Security Mechanism:** Demands typing "CLEAN" into an input field before allowing destructive execution.
- **Snapshot Toggle:** Prominent checkbox guaranteeing pre-flight snapshot creation.

### Visual Treemap & Twin Finder
- **Treemap Bar:** Segmented flex bar with vibrant distinct category colors (`sky-500`, `indigo-500`, `violet-500`, `amber-500`, `slate-400`).
- **Btrfs CoW Pill:** Distinct cyan badge signaling zero physical disk consumption via `cp --reflink`.

### Splash Screen
- **Composition:** cream (`neutral-bg`) full-bleed overlay, mascot centered above the wordmark and a pixel-font tagline, nothing else — the brand moment stays uncluttered.
- **Motion:** the mascot waddles in place (a 900ms rotate+hop loop, `mascotWaddle`) for a 1000ms hold, then the whole overlay fades and scales up 4% over 450ms (`splashExit`) to reveal the already-loading app underneath. The real app never waits on the splash; it's a branded moment layered on top of work already in flight.
- **Reduced motion:** the waddle is dropped; only the exit fade remains, shortened to 250ms.

### Skeleton Loading States
- **Shimmer:** a coral-tinted sweep with a *stepped* cadence (`steps(10, jump-end)`, not a smooth ease) — pixel-art themed motion without literally jagged shapes. Applies to every `Skeleton` bar app-wide via the `.skeleton-pixel` utility.
- **Pixel dust:** two static 6px corner squares (sparkle yellow + mint), echoing the mascot's sparkle motif, placed only on the primary header/summary card of a loading screen (`.skeleton-card`) — never on every repeated row or card, so the accent reads as texture, not clutter.
- **Reduced motion:** the sweep is replaced by a slow, position-free opacity fade.

### Error Banner
- **Shape:** `bg-red-50` / `border-red-200` rounded-3xl card, same family as other alert surfaces, with an icon chip, a one-line failure message, an optional **Retry** action, and a dismiss control (both a text link and an icon button).
- **Rule:** every view that calls the native bridge renders one of these on catch. The activity log drawer is closed by default, so a `catch` block that only logs is invisible to the user — this component is the visible half of every error path.

### Motion Vocabulary
Three timing tiers, used consistently rather than picking a duration ad hoc: **feedback** (100–300ms, state changes and button presses), **transition** (750ms, `animate-mode-switch` — the Casual ⇄ Advanced fade + slight scale/slide on the main stage, applied without remounting views so in-flight data survives the switch), and **brand moment** (~1450ms total: the splash's 1000ms hold + 450ms exit). Don't introduce a fourth duration without tying it to one of these tiers.

## Do's and Don'ts

### Do:
- **Do** show active process locks and dry-run file counts before prompting for action.
- **Do** celebrate successful cleanups with cheerful mascot animations and exact freed megabytes, scaled to the actual amount freed (confetti tier: modest / solid / major).
- **Do** provide 1-click rollback access for system tweaks and Windows Update policies.
- **Do** use Lucide icons consistently across all UI elements.
- **Do** render an `ErrorBanner` in every view that calls the native bridge, on every catch block — never rely on the activity log alone.

### Don't:
- **Don't** use generic dark-mode neon glows that contradict the cheerful daylight aesthetic.
- **Don't** hide consequences of destructive actions; always display affected path trees.
- **Don't** run the GUI with elevated root or administrator privileges.
- **Don't** pair gray text with colored background containers.
- **Don't** let a failed action fail silently. `addLog()` alone is not user-facing feedback — the terminal drawer defaults to closed.
