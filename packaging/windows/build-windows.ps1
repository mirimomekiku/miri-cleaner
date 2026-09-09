# PowerShell build & package script for Windows 10/11
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "==> Building Miri Cleaner CLI/TUI (x86_64-pc-windows-msvc)..." -ForegroundColor Cyan
Push-Location $RootDir
cargo build --release -p miri-cli
Pop-Location
Write-Host "==> CLI binary compiled: target\release\miri-cleaner.exe" -ForegroundColor Green

Write-Host "==> Building Tauri desktop application (GUI)..." -ForegroundColor Cyan
$GuiDir = Join-Path $RootDir "packages\miri-gui"
Push-Location $GuiDir
if (-not (Test-Path "node_modules")) {
    Write-Host "==> Installing npm dependencies..." -ForegroundColor Cyan
    npm install
}
npm run tauri build
Pop-Location

$BundleDir = Join-Path $GuiDir "src-tauri\target\release\bundle"
$Found = $false
foreach ($kind in @("nsis", "msi")) {
    $dir = Join-Path $BundleDir $kind
    if (Test-Path $dir) {
        Get-ChildItem $dir -Filter "*.exe","*.msi" -ErrorAction SilentlyContinue | ForEach-Object {
            Write-Host "==> Desktop installer generated: $($_.FullName)" -ForegroundColor Green
            $Found = $true
        }
    }
}
if (-not $Found) {
    Write-Host "==> No bundled installer found under $BundleDir; check the 'npm run tauri build' output above." -ForegroundColor Yellow
}

Write-Host "==> Packaging optional CLI-only installer..." -ForegroundColor Cyan
if (Get-Command "makensis" -ErrorAction SilentlyContinue) {
    makensis "$RootDir\packaging\windows\installer.nsis"
    Write-Host "==> CLI setup executable generated!" -ForegroundColor Green
} else {
    Write-Host "==> NSIS compiler not found in PATH; CLI installer script configured at packaging\windows\installer.nsis" -ForegroundColor Yellow
}
