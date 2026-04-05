$ErrorActionPreference = "Continue"
Write-Host "Rolling back failed migration..."
npx prisma migrate resolve --rolled-back 20260405100000_musician_parity_soft_delete 2>&1
Write-Host "Deploying..."
npx prisma migrate deploy 2>&1
Write-Host "---ALL DONE---"
