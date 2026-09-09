#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Colors
PINK='\033[38;2;255;157;157m'
GREEN='\033[38;2;88;204;2m'
YELLOW='\033[38;2;255;200;0m'
CYAN='\033[38;2;28;176;246m'
BOLD='\033[1m'
NC='\033[0m' # No Color

show_banner() {
    echo -e "${PINK}${BOLD}╭───────────────────────────────────────────────────╮${NC}"
    echo -e "${PINK}${BOLD}│  (•◡•) MIRI CLEANER - System Maintenance Suite   │${NC}"
    echo -e "${PINK}${BOLD}╰───────────────────────────────────────────────────╯${NC}"
}

show_help() {
    show_banner
    echo -e "${BOLD}Usage:${NC} ./miri.sh <command> [options...]"
    echo ""
    echo -e "${BOLD}Commands:${NC}"
    echo -e "  ${PINK}gui${NC}            Launch the native desktop GUI (React / Electron shell)"
    echo -e "  ${PINK}tui${NC}            Launch the interactive terminal UI (Ratatui)"
    echo -e "  ${PINK}scan${NC}           Run non-destructive scan (pass --json for JSON format)"
    echo -e "  ${PINK}clean${NC}          Clean system targets (pass --dry-run for simulation)"
    echo -e "  ${PINK}clean-dry${NC}      Shortcut for dry-run simulation"
    echo -e "  ${PINK}tweak${NC}          Run OS tweaks (dnf-cache, journal-vacuum, flatpak, windows-update)"
    echo -e "  ${PINK}dev-cache${NC}      Prune developer toolchains (Docker, Cargo, Go, npm)"
    echo -e "  ${PINK}rollback${NC}       Inspect audit history or restore snapshots"
    echo -e "  ${PINK}test${NC}           Run test suite across all workspace crates"
    echo -e "  ${PINK}package${NC}        Build distributable package (RPM on Linux, NSIS on Windows)"
    echo ""
    echo -e "${BOLD}Examples:${NC}"
    echo -e "  ./miri.sh gui"
    echo -e "  ./miri.sh scan"
    echo -e "  ./miri.sh clean --dry-run"
    echo -e "  ./miri.sh tweak dnf-cache"
    echo -e "  ./miri.sh tweak windows-update --state disable"
    echo -e "  ./miri.sh dev-cache --all"
}

CMD="${1:-menu}"
shift || true

case "$CMD" in
    gui)
        ./scripts/gui.sh "$@"
        ;;
    tui)
        echo -e "${PINK}==> Launching Miri Cleaner Interactive TUI...${NC}"
        cargo run -q -p miri-cli -- tui "$@"
        ;;
    scan)
        cargo run -q -p miri-cli -- scan "$@"
        ;;
    clean)
        cargo run -q -p miri-cli -- clean "$@"
        ;;
    clean-dry)
        cargo run -q -p miri-cli -- clean --dry-run "$@"
        ;;
    tweak)
        cargo run -q -p miri-cli -- tweak "$@"
        ;;
    dev-cache)
        cargo run -q -p miri-cli -- dev-cache "$@"
        ;;
    rollback)
        cargo run -q -p miri-cli -- rollback "$@"
        ;;
    test)
        echo -e "${GREEN}==> Running tests across all workspace crates...${NC}"
        cargo test --workspace "$@"
        ;;
    package)
        echo -e "${CYAN}==> Packaging Miri Cleaner for Linux...${NC}"
        ./packaging/fedora/build-rpm.sh
        ;;
    help|--help|-h)
        show_help
        ;;
    menu|"")
        show_banner
        echo -e "Please select an action:"
        echo -e "  1) Launch Desktop GUI"
        echo -e "  2) Launch Terminal TUI"
        echo -e "  3) Run Non-Destructive Scan"
        echo -e "  4) Run Dry-Run Cleanup Simulation"
        echo -e "  5) Prune Developer Caches"
        echo -e "  6) Run Test Suite"
        echo -e "  q) Quit"
        echo ""
        read -rp "Enter choice [1-6, q]: " choice
        case "$choice" in
            1) ./miri.sh gui ;;
            2) ./miri.sh tui ;;
            3) ./miri.sh scan ;;
            4) ./miri.sh clean-dry ;;
            5) ./miri.sh dev-cache --all ;;
            6) ./miri.sh test ;;
            *) echo "Exiting." ;;
        esac
        ;;
    *)
        echo -e "${BOLD}Unknown command:${NC} $CMD"
        echo "Run './miri.sh help' for usage instructions."
        exit 1
        ;;
esac
