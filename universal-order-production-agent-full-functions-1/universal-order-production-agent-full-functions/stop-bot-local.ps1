param(
  [switch] $Quiet
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidFile = Join-Path $ProjectRoot ".local\bot.pid"

if (-not (Test-Path $PidFile)) {
  if (-not $Quiet) { Write-Host "No Telegram bot PID file found." }
  exit 0
}

$botPid = Get-Content $PidFile -ErrorAction SilentlyContinue
$process = if ($botPid) { Get-Process -Id $botPid -ErrorAction SilentlyContinue } else { $null }

if ($process) {
  Stop-Process -Id $botPid
  if (-not $Quiet) { Write-Host "Stopped Telegram bot process $botPid." }
} elseif (-not $Quiet) {
  Write-Host "Saved Telegram bot process $botPid was not running."
}

Remove-Item -LiteralPath $PidFile -Force
