# Push na origin/main — pokrece Netlify deploy ako je sajt povezan sa GitHubom.
# Upotreba:  .\scripts\push-deploy.ps1
#           .\scripts\push-deploy.ps1 "poruka za commit"
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== pronadjibend-web ===" -ForegroundColor Cyan
Write-Host (Get-Location)

git status -sb
git add -A
$porcelain = git status --porcelain
if ($porcelain) {
  $msg = if ($args[0] -and $args[0].Trim()) { $args[0].Trim() } else { "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
  git commit -m $msg
} else {
  Write-Host "Nema novih izmena za commit (samo push ako ima nepushovanih commit-ova)." -ForegroundColor Yellow
}

git push origin main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Gotovo: push na main." -ForegroundColor Green
