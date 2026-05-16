param(
  [string] $TaskName = "AIOperationsTelegramBot",
  [switch] $StartNow,
  [switch] $NoPause
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartScript = Join-Path $ProjectRoot "start-bot-local.ps1"
$WatchdogScript = Join-Path $ProjectRoot "bot-watchdog.ps1"
$EnvFile = Join-Path $ProjectRoot ".env"

function Read-EnvFile($Path) {
  $values = @{}
  if (-not (Test-Path $Path)) { return $values }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
      $index = $line.IndexOf("=")
      $key = $line.Substring(0, $index).Trim()
      $value = $line.Substring($index + 1).Trim()
      $values[$key] = $value
    }
  }
  return $values
}

if (-not (Test-Path $StartScript)) {
  Write-Host "Cannot install autostart: start-bot-local.ps1 was not found."
  exit 1
}

if (-not (Test-Path $WatchdogScript)) {
  Write-Host "Cannot install autostart: bot-watchdog.ps1 was not found."
  exit 1
}

$envValues = Read-EnvFile $EnvFile
$missing = @()
if (-not $envValues["TELEGRAM_BOT_TOKEN"]) { $missing += "Telegram bot token" }
if (-not $envValues["MANAGER_CHAT_ID"]) { $missing += "Manager chat ID" }
if (-not $envValues["OPENROUTER_API_KEY"]) { $missing += "OpenRouter API key" }

if ($missing.Count -gt 0) {
  Write-Host "Bot autostart was not installed because required fields are empty:"
  foreach ($item in $missing) { Write-Host " - $item" }
  Write-Host ""
  Write-Host "Open START_APP.bat, fill resources in the web cabinet, click Save, then run install-bot-autostart.bat again."
  if (-not $NoPause) { pause }
  exit 1
}

$command = "Set-Location -LiteralPath '$($ProjectRoot.Replace("'", "''"))'; & '$($WatchdogScript.Replace("'", "''"))'"
$encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -EncodedCommand $encodedCommand"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Days 30)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Keeps AI Operations Telegram bot running in polling mode for the current Windows user." `
  -Force | Out-Null

Write-Host "Telegram bot autostart installed as Windows task: $TaskName"
Write-Host "It will start automatically when this Windows user logs in and restart the bot if it stops."

if ($StartNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 2
  Write-Host "Autostart task started now. Check status in the web cabinet or .local/bot.out.log."
}

if (-not $NoPause) { pause }
