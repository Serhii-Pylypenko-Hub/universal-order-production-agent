param(
  [string] $ReleaseName = "AI-Operations-Local-App"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReleasesDir = Join-Path $ProjectRoot "releases"
$ReleaseDir = Join-Path $ReleasesDir $ReleaseName
$ZipPath = Join-Path $ReleasesDir "$ReleaseName.zip"

function Copy-RequiredItem($Name) {
  $source = Join-Path $ProjectRoot $Name
  $destination = Join-Path $ReleaseDir $Name
  if (-not (Test-Path $source)) {
    Write-Error "Required item not found: $Name"
  }
  Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
}

if (-not (Test-Path (Join-Path $ProjectRoot ".tools\node\node.exe"))) {
  Write-Error "Portable Node.js was not found at .tools\node."
}

if (Test-Path (Join-Path $ReleaseDir "stop-local.ps1")) {
  & (Join-Path $ReleaseDir "stop-local.ps1") -Quiet
}
if (Test-Path (Join-Path $ReleaseDir "stop-bot-local.ps1")) {
  & (Join-Path $ReleaseDir "stop-bot-local.ps1") -Quiet
}
Start-Sleep -Milliseconds 500

Remove-Item -LiteralPath $ReleaseDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $ZipPath -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null

$items = @(
  ".tools",
  "app",
  "data",
  "documentation",
  "schemas",
  "templates",
  ".env.example",
  "package.json",
  "package-lock.json",
  "README.md",
  "START_HERE.txt",
  "START_APP.bat",
  "START_TELEGRAM_BOT.bat",
  "STOP_APP.bat",
  "STOP_TELEGRAM_BOT.bat",
  "bot-watchdog.ps1",
  "install-bot-autostart.bat",
  "install-bot-autostart.ps1",
  "uninstall-bot-autostart.bat",
  "uninstall-bot-autostart.ps1",
  "start-local.bat",
  "start-local.ps1",
  "start-bot-local.bat",
  "start-bot-local.ps1",
  "stop-local.bat",
  "stop-local.ps1",
  "stop-bot-local.bat",
  "stop-bot-local.ps1"
)

foreach ($item in $items) {
  Copy-RequiredItem $item
}

Remove-Item -LiteralPath (Join-Path $ReleaseDir ".local") -Recurse -Force -ErrorAction SilentlyContinue

@" 
TELEGRAM_BOT_TOKEN=
MANAGER_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=

BOT_MODE=polling
WEBHOOK_URL=
PORT=3000

OPENROUTER_API_KEY=
AI_MODEL=openai/gpt-4o-mini

GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_JSON=
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=
GOOGLE_CALENDAR_ID=

LOCAL_DATA_PATH=./data/local_workspace.json
"@ | Set-Content -Path (Join-Path $ReleaseDir ".env") -Encoding UTF8

Compress-Archive -LiteralPath $ReleaseDir -DestinationPath $ZipPath -Force

Write-Host "Release folder:"
Write-Host $ReleaseDir
Write-Host "Release archive:"
Write-Host $ZipPath
