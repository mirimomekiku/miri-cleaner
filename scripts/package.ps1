$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\.."
& ".\packaging\windows\build-windows.ps1"
