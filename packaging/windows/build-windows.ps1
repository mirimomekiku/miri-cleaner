# PowerShell build & package script for Windows 10/11
Write-Host "==> Building Miri Cleaner Windows Binaries (x86_64-pc-windows-msvc)..." -ForegroundColor Cyan

cargo build --release -p miri-cli
Write-Host "==> Binary compiled: target\release\miri-cleaner.exe" -ForegroundColor Green

Write-Host "==> Building React frontend distribution..." -ForegroundColor Cyan
Set-Location -Path "packages\miri-gui"
npm run build
Set-Location -Path "..\..\"

Write-Host "==> Packaging MSI and NSIS installers..." -ForegroundColor Cyan
if (Get-Command "makensis" -ErrorAction SilentlyContinue) {
    makensis packaging\windows\installer.nsis
    Write-Host "==> Setup executable generated!" -ForegroundColor Green
} else {
    Write-Host "==> NSIS compiler not found in PATH; NSIS script configured at packaging\windows\installer.nsis" -ForegroundColor Yellow
}
