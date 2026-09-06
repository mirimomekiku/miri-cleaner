$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\.."

if (-not (Test-Path "target\release\miri-cleaner.exe")) {
    Write-Host "==> Compiling Miri Cleaner Rust core engine..." -ForegroundColor Cyan
    cargo build --release -p miri-cli
}

Set-Location "$ScriptDir\..\packages\miri-gui"
if (-not (Test-Path "node_modules")) {
    Write-Host "==> Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path "dist\index.html")) {
    Write-Host "==> Building UI assets with relative base..." -ForegroundColor Cyan
    npm run build
}

Write-Host "==> Launching Miri Cleaner Desktop Application Window..." -ForegroundColor Magenta
npx electron electron/main.cjs @args
