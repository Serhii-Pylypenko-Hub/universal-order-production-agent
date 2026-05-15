param(
  [int] $Port = 3000,
  [switch] $NoBrowser
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeDir = Join-Path $ProjectRoot ".tools\node"
$Node = Join-Path $NodeDir "node.exe"
$LocalDir = Join-Path $ProjectRoot ".local"
$PidFile = Join-Path $LocalDir "server.pid"
$OutLogFile = Join-Path $LocalDir "server.out.log"
$ErrLogFile = Join-Path $LocalDir "server.err.log"
$Url = "http://localhost:$Port"

function Test-LocalWeb($TargetUrl) {
  try {
    $response = Invoke-WebRequest -Uri $TargetUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

if (-not (Test-Path $Node)) {
  Write-Host "Local Node.js was not found at .tools\node."
  Write-Host "Run the prepared project setup first or install Node.js 18+."
  exit 1
}

New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null

if (Test-LocalWeb $Url) {
  Write-Host "Application is already running at $Url"
  if (-not $NoBrowser) {
    Start-Process $Url
  }
  exit 0
}

if (Test-Path $PidFile) {
  $oldPid = Get-Content $PidFile -ErrorAction SilentlyContinue
  if ($oldPid) {
    $oldProcess = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
    if ($oldProcess) {
      Write-Host "A saved server process exists but $Url is not responding. Stop it first:"
      Write-Host ".\stop-local.ps1"
      exit 1
    }
  }
  Remove-Item -LiteralPath $PidFile -Force
}

$env:Path = "$NodeDir;$env:Path"
$env:PORT = [string]$Port

$process = Start-Process `
  -FilePath $Node `
  -ArgumentList "app/js/web/server.js" `
  -WorkingDirectory $ProjectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $OutLogFile `
  -RedirectStandardError $ErrLogFile `
  -PassThru

Set-Content -Path $PidFile -Value $process.Id

for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Milliseconds 500
  if (Test-LocalWeb $Url) {
    Write-Host "Application started at $Url"
    Write-Host "Output log: $OutLogFile"
    Write-Host "Error log: $ErrLogFile"
    if (-not $NoBrowser) {
      Start-Process $Url
    }
    exit 0
  }
}

Write-Host "Server process started but did not respond at $Url."
Write-Host "Check output log: $OutLogFile"
Write-Host "Check error log: $ErrLogFile"
exit 1
