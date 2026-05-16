@echo off
setlocal
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0uninstall-bot-autostart.ps1"
endlocal
