$ErrorActionPreference = "Continue"
$migrations = @(
  "20260328120000_band_ispaid_plan",
  "20260329120000_live_request_waiter_tip",
  "20260329200000_band_allow_tips_tip_amount",
  "20260330120500_band_max_pending_requests",
  "20260330163000_song_submission_queue",
  "20260331170446_band_profile_media_limits",
  "20260331180900_add_plain_password"
)

foreach ($m in $migrations) {
  Write-Host "Resolving $m as rolled-back..."
  npx prisma migrate resolve --rolled-back $m 2>&1
  Write-Host "Resolving $m as applied..."
  npx prisma migrate resolve --applied $m 2>&1
}

Write-Host "Deploying new migrations..."
npx prisma migrate deploy 2>&1
Write-Host "---ALL DONE---"
