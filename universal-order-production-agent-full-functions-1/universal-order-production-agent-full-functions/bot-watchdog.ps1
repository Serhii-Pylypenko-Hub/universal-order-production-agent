param(
  [int] $IntervalSeconds = 30
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LocalDir = Join-Path $ProjectRoot ".local"
$BotPidFile = Join-Path $LocalDir "bot.pid"
$WatchdogPidFile = Join-Path $LocalDir "bot-watchdog.pid"
$WatchdogLogFile = Join-Path $LocalDir "bot-watchdog.log"
$StartScript = Join-Path $ProjectRoot "start-bot-local.ps1"

New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null
Set-Content -Path $WatchdogPidFile -Value $PID

function Write-WatchdogLog($Message) {
  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $WatchdogLogFile -Value $line
}

function Test-RunningPid($PidFile) {
  if (-not (Test-Path $PidFile)) { return $false }
  $savedPid = Get-Content $PidFile -ErrorAction SilentlyContinue
  if (-not $savedPid) { return $false }
  return [bool](Get-Process -Id $savedPid -ErrorAction SilentlyContinue)
}

Write-WatchdogLog "Watchdog started. PID: $PID"

while ($true) {
  try {
    if (-not (Test-RunningPid $BotPidFile)) {
      if (Test-Path $BotPidFile) {
        Remove-Item -LiteralPath $BotPidFile -Force -ErrorAction SilentlyContinue
      }
      Write-WatchdogLog "Telegram bot is not running. Starting it..."
      & $StartScript -NoPause | Out-Null
    }
  } catch {
    Write-WatchdogLog "Watchdog error: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds ([Math]::Max(10, $IntervalSeconds))
}
