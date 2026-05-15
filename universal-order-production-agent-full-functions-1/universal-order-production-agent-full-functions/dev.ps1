param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $ArgsList
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$NodeDir = Join-Path $ProjectRoot ".tools\node"
$Npm = Join-Path $NodeDir "npm.cmd"

if (-not (Test-Path $Npm)) {
  Write-Error "Local Node.js was not found at .tools\node. Install Node.js 18+ or restore the portable runtime."
}

$env:Path = "$NodeDir;$env:Path"

if ($ArgsList.Count -eq 0) {
  Write-Host "Usage:"
  Write-Host "  .\dev.ps1 install"
  Write-Host "  .\dev.ps1 setup:demo"
  Write-Host "  .\dev.ps1 health"
  Write-Host "  .\dev.ps1 demo:order"
  Write-Host "  .\dev.ps1 test"
  Write-Host "  .\dev.ps1 bot:polling"
  exit 0
}

$Command = $ArgsList[0]
$Rest = @()
if ($ArgsList.Count -gt 1) {
  $Rest = $ArgsList[1..($ArgsList.Count - 1)]
}

if ($Command -eq "install") {
  & $Npm install @Rest
} elseif ($Command -eq "test") {
  & $Npm test @Rest
} else {
  & $Npm run $Command -- @Rest
}

exit $LASTEXITCODE
