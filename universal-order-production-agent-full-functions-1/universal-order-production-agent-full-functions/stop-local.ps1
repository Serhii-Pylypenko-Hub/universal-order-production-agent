param(
  [switch] $Quiet
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LocalDir = Join-Path $ProjectRoot ".local"
$PidFile = Join-Path $LocalDir "server.pid"

if (-not (Test-Path $PidFile)) {
  if (-not $Quiet) {
    Write-Host "No local server PID file found."
  }
  exit 0
}

$serverPid = Get-Content $PidFile -ErrorAction SilentlyContinue
if (-not $serverPid) {
  Remove-Item -LiteralPath $PidFile -Force
  exit 0
}

$process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
if ($process) {
  Stop-Process -Id $serverPid
  if (-not $Quiet) {
    Write-Host "Stopped local server process $serverPid."
  }
} elseif (-not $Quiet) {
  Write-Host "Saved server process $serverPid was not running."
}

Remove-Item -LiteralPath $PidFile -Force
exit 0
