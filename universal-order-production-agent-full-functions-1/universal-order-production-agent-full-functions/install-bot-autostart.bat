@echo off
setlocal
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0install-bot-autostart.ps1" -StartNow
endlocal
