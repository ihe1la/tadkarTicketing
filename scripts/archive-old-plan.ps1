$ErrorActionPreference = "Stop"

$archive = Join-Path $PSScriptRoot "..\_archive\old-plan"
New-Item -ItemType Directory -Force $archive | Out-Null

$files = @(
  "AGENTS.md",
  "CODEX.md",
  "PLANS.md",
  "START_HERE.md",
  "README.md"
)

foreach ($file in $files) {
  $source = Join-Path (Join-Path $PSScriptRoot "..") $file
  if (Test-Path $source) {
    Copy-Item $source (Join-Path $archive $file) -Force
  }
}

Write-Host "Old root planning files copied to $archive"
Write-Host "Review the backup before overwriting files."
