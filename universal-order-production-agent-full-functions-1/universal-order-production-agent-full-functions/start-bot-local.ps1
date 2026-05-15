param(
  [switch] $NoPause
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeDir = Join-Path $ProjectRoot ".tools\node"
$Node = Join-Path $NodeDir "node.exe"
$LocalDir = Join-Path $ProjectRoot ".local"
$PidFile = Join-Path $LocalDir "bot.pid"
$OutLogFile = Join-Path $LocalDir "bot.out.log"
$ErrLogFile = Join-Path $LocalDir "bot.err.log"

if (-not (Test-Path $Node)) {
  Write-Host "Local Node.js was not found at .tools\node."
  exit 1
}

New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null

$EnvFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $EnvFile)) {
  Write-Host "Configuration file .env was not found."
  Write-Host "Open start-local.bat, fill the highlighted fields, and click Save first."
  if (-not $NoPause) { pause }
  exit 1
}

$envValues = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $index = $line.IndexOf("=")
    $key = $line.Substring(0, $index).Trim()
    $value = $line.Substring($index + 1).Trim()
    $envValues[$key] = $value
  }
}

$missing = @()
if (-not $envValues["TELEGRAM_BOT_TOKEN"]) { $missing += "Telegram bot token" }
if (-not $envValues["MANAGER_CHAT_ID"]) { $missing += "Manager chat ID" }
if (-not $envValues["OPENROUTER_API_KEY"]) { $missing += "OpenRouter API key" }

if ($missing.Count -gt 0) {
  Write-Host "Telegram bot cannot start because required fields are empty:"
  foreach ($item in $missing) { Write-Host " - $item" }
  Write-Host ""
  Write-Host "Open start-local.bat, fill the highlighted fields, click Save, then run start-bot-local.bat again."
  if (-not $NoPause) { pause }
  exit 1
}

if (Test-Path $PidFile) {
  $oldPid = Get-Content $PidFile -ErrorAction SilentlyContinue
  if ($oldPid -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
    Write-Host "Telegram bot is already running. PID: $oldPid"
    exit 0
  }
  Remove-Item -LiteralPath $PidFile -Force
}

$env:Path = "$NodeDir;$env:Path"
$env:BOT_MODE = "polling"

$process = Start-Process `
  -FilePath $Node `
  -ArgumentList "app/js/bot/telegramBot.js" `
  -WorkingDirectory $ProjectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $OutLogFile `
  -RedirectStandardError $ErrLogFile `
  -PassThru

Set-Content -Path $PidFile -Value $process.Id
Start-Sleep -Seconds 2

if ($process.HasExited) {
  Write-Host "Telegram bot did not start. Check:"
  Write-Host $ErrLogFile
  if (-not $NoPause) { pause }
  exit 1
}

Write-Host "Telegram bot started in polling mode. PID: $($process.Id)"
Write-Host "Output log: $OutLogFile"
Write-Host "Error log: $ErrLogFile"
if (-not $NoPause) { pause }
