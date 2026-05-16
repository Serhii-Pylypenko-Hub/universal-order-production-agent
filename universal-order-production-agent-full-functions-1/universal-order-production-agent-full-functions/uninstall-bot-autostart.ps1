param(
  [string] $TaskName = "AIOperationsTelegramBot",
  [switch] $NoPause
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$StopScript = Join-Path $ProjectRoot "stop-bot-local.ps1"
$WatchdogPidFile = Join-Path $ProjectRoot ".local\bot-watchdog.pid"
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($task) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
}

if (Test-Path $WatchdogPidFile) {
  $watchdogPid = Get-Content $WatchdogPidFile -ErrorAction SilentlyContinue
  $watchdogProcess = if ($watchdogPid) { Get-Process -Id $watchdogPid -ErrorAction SilentlyContinue } else { $null }
  if ($watchdogProcess) {
    Stop-Process -Id $watchdogPid -Force
    Write-Host "Stopped bot watchdog process $watchdogPid."
  }
  Remove-Item -LiteralPath $WatchdogPidFile -Force -ErrorAction SilentlyContinue
}

if (Test-Path $StopScript) {
  & $StopScript -Quiet
}

if ($task) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Telegram bot autostart removed: $TaskName"
} else {
  Write-Host "Telegram bot autostart task was not found: $TaskName"
}

if (-not $NoPause) { pause }
