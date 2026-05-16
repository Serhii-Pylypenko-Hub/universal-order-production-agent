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
$RuntimeUrlFile = Join-Path $LocalDir "current-url.txt"
$RuntimePortFile = Join-Path $LocalDir "current-port.txt"
$RuntimePathFile = Join-Path $LocalDir "project-path.txt"

function Test-LocalWeb($TargetUrl) {
  $uri = [Uri] $TargetUrl
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect($uri.Host, $uri.Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(300)) {
      return $false
    }
    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Test-ExpectedApi($TargetUrl) {
  try {
    $response = Invoke-WebRequest -Uri "$TargetUrl/api/health" -UseBasicParsing -TimeoutSec 2
    $health = $response.Content | ConvertFrom-Json
    return $health.ok -eq $true -and $health.app -eq "universal-order-production-agent"
  } catch {
    return $false
  }
}

function Find-FreePort([int] $StartPort) {
  for ($candidate = $StartPort; $candidate -lt ($StartPort + 30); $candidate++) {
    if (-not (Test-LocalWeb "http://localhost:$candidate")) {
      return $candidate
    }
  }
  throw "No free local port found between $StartPort and $($StartPort + 29)."
}

function Find-RunningAppPort([int] $StartPort) {
  for ($candidate = $StartPort; $candidate -lt ($StartPort + 20); $candidate++) {
    $candidateUrl = "http://localhost:$candidate"
    if ((Test-LocalWeb $candidateUrl) -and (Test-ExpectedApi $candidateUrl)) {
      return $candidate
    }
  }
  return 0
}

function Stop-SavedServerProcess {
  if (-not (Test-Path $PidFile)) {
    return $false
  }
  $oldPid = Get-Content $PidFile -ErrorAction SilentlyContinue
  if (-not $oldPid) {
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
    return $false
  }
  $oldProcess = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
  if ($oldProcess) {
    Write-Host "Restarting saved local server process $oldPid so paths and web assets are refreshed."
    try {
      Stop-Process -Id $oldPid -Force
      Start-Sleep -Milliseconds 700
    } catch {
      Write-Host "Could not stop old saved process $oldPid. Starting on a free port if needed."
    }
  }
  Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
  return $true
}

function Write-RuntimePathFiles([int] $CurrentPort) {
  $currentUrl = "http://localhost:$CurrentPort"
  Set-Content -Path $RuntimeUrlFile -Value $currentUrl -Encoding UTF8
  Set-Content -Path $RuntimePortFile -Value ([string]$CurrentPort) -Encoding UTF8
  Set-Content -Path $RuntimePathFile -Value $ProjectRoot -Encoding UTF8
}

if (-not (Test-Path $Node)) {
  Write-Host "Local Node.js was not found at .tools\node."
  Write-Host "Run the prepared project setup first or install Node.js 18+."
  exit 1
}

New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null

$didRestartSavedServer = Stop-SavedServerProcess

if (Test-LocalWeb $Url -and -not (Test-ExpectedApi $Url)) {
  $oldPort = $Port
  $runningPort = Find-RunningAppPort 3011
  if ($runningPort -gt 0) {
    $Port = $runningPort
    $Url = "http://localhost:$Port"
    Write-Host "Port $oldPort is busy with another local server."
    Write-Host "Application is already running at $Url"
    Write-RuntimePathFiles $Port
    if (-not $NoBrowser) {
      Start-Process "$Url/?v=$(Get-Date -Format yyyyMMddHHmmss)"
    }
    exit 0
  }
  $Port = Find-FreePort 3011
  $Url = "http://localhost:$Port"
  Write-Host "Port $oldPort is busy, but it is not this application API."
  Write-Host "Starting this application at $Url instead."
}

if (Test-ExpectedApi $Url) {
  if (-not $didRestartSavedServer) {
    Write-Host "Application is already running at $Url"
    Write-RuntimePathFiles $Port
    if (-not $NoBrowser) {
      Start-Process "$Url/?v=$(Get-Date -Format yyyyMMddHHmmss)"
    }
    exit 0
  }
}

$env:Path = "$NodeDir;$env:Path"
$env:PORT = [string]$Port

for ($attempt = 0; $attempt -lt 20; $attempt++) {
  $Url = "http://localhost:$Port"
  if (Test-LocalWeb $Url) {
    if (Test-ExpectedApi $Url) {
      Write-Host "Application is already running at $Url"
      if (-not $NoBrowser) {
        Start-Process $Url
      }
      exit 0
    }
    $Port++
    $env:PORT = [string]$Port
    continue
  }

  $serverCommand = "`$env:Path = '$NodeDir;' + `$env:Path; `$env:PORT = '$Port'; Set-Location '$ProjectRoot'; & '$Node' 'app/js/web/server.js'"
  $process = Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $serverCommand) `
    -WorkingDirectory $ProjectRoot `
    -PassThru

  Set-Content -Path $PidFile -Value $process.Id

  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    $process.Refresh()
    if ($process.HasExited) {
      break
    }
    if (Test-ExpectedApi $Url) {
      Start-Sleep -Milliseconds 500
      $process.Refresh()
      if (-not $process.HasExited) {
        Write-Host "Application started at $Url"
        Write-Host "Keep the server PowerShell window open while using the app."
        Write-RuntimePathFiles $Port
        if (-not $NoBrowser) {
          Start-Process "$Url/?v=$(Get-Date -Format yyyyMMddHHmmss)"
        }
        exit 0
      }
      break
    }
  }

  Write-Host "Port $Port did not stay running. Trying next port..."
  $Port++
  $env:PORT = [string]$Port
}

Write-Host "Server process did not stay running."
Write-Host "Check output log: $OutLogFile"
Write-Host "Check error log: $ErrLogFile"
exit 1
