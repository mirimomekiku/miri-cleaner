<#
.SYNOPSIS
    Miri Cleaner - Windows PowerShell Command Runner (•◡•)
.DESCRIPTION
    Easily run any Miri Cleaner command on Windows 10/11.
.EXAMPLE
    .\miri.ps1 gui
    .\miri.ps1 scan
    .\miri.ps1 clean-dry
    .\miri.ps1 tweak windows-update --state disable
#>

[CmdletBinding()]
param (
    [Parameter(Position=0)]
    [string]$Command = "menu",
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

function Show-Banner {
    Write-Host "╭───────────────────────────────────────────────────╮" -ForegroundColor Red
    Write-Host "│  (•◡•) MIRI CLEANER - System Maintenance Suite   │" -ForegroundColor Red
    Write-Host "╰───────────────────────────────────────────────────╯" -ForegroundColor Red
}

function Show-Help {
    Show-Banner
    Write-Host "Usage: .\miri.ps1 <command> [options...]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  gui          Launch desktop GUI (React / Tauri dev server)"
    Write-Host "  tui          Launch interactive terminal UI (Ratatui)"
    Write-Host "  scan         Run non-destructive inspection"
    Write-Host "  clean        Clean system targets"
    Write-Host "  clean-dry    Run dry-run simulation without file deletion"
    Write-Host "  tweak        Run OS tweaks (e.g. windows-update)"
    Write-Host "  dev-cache    Clean developer caches (Docker, Cargo, Go, npm)"
    Write-Host "  rollback     View audit history or restore checkpoints"
    Write-Host "  test         Run test suite across all workspace crates"
    Write-Host "  package      Package into Windows MSI and NSIS executable"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\miri.ps1 gui"
    Write-Host "  .\miri.ps1 scan"
    Write-Host "  .\miri.ps1 clean-dry"
    Write-Host "  .\miri.ps1 tweak windows-update --state disable"
    Write-Host "  .\miri.ps1 tweak windows-update --state restore"
    Write-Host "  .\miri.ps1 dev-cache --all"
}

switch ($Command.ToLower()) {
    "gui" {
        & "$ScriptDir\scripts\gui.ps1" @RemainingArgs
    }
    "tui" {
        Write-Host "==> Launching Interactive TUI..." -ForegroundColor Magenta
        cargo run -q -p miri-cli -- tui @RemainingArgs
    }
    "scan" {
        cargo run -q -p miri-cli -- scan @RemainingArgs
    }
    "clean" {
        cargo run -q -p miri-cli -- clean @RemainingArgs
    }
    "clean-dry" {
        cargo run -q -p miri-cli -- clean --dry-run @RemainingArgs
    }
    "tweak" {
        cargo run -q -p miri-cli -- tweak @RemainingArgs
    }
    "dev-cache" {
        cargo run -q -p miri-cli -- dev-cache @RemainingArgs
    }
    "rollback" {
        cargo run -q -p miri-cli -- rollback @RemainingArgs
    }
    "test" {
        Write-Host "==> Running test suite..." -ForegroundColor Green
        cargo test --workspace @RemainingArgs
    }
    "package" {
        Write-Host "==> Packaging Windows Installer..." -ForegroundColor Cyan
        & ".\packaging\windows\build-windows.ps1"
    }
    "help" {
        Show-Help
    }
    "menu" {
        Show-Banner
        Write-Host "Please choose an option:" -ForegroundColor Cyan
        Write-Host "  1) Launch Desktop GUI"
        Write-Host "  2) Launch Terminal TUI"
        Write-Host "  3) Run Non-Destructive Scan"
        Write-Host "  4) Run Dry-Run Cleanup Simulation"
        Write-Host "  5) Prune Developer Caches"
        Write-Host "  6) Run Test Suite"
        Write-Host "  Q) Quit"
        Write-Host ""
        $choice = Read-Host "Enter choice [1-6, Q]"
        switch ($choice) {
            "1" { & .\miri.ps1 gui }
            "2" { & .\miri.ps1 tui }
            "3" { & .\miri.ps1 scan }
            "4" { & .\miri.ps1 clean-dry }
            "5" { & .\miri.ps1 dev-cache --all }
            "6" { & .\miri.ps1 test }
            default { Write-Host "Exiting." }
        }
    }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Show-Help
        exit 1
    }
}
