# Migrate PLATFORMA Supabase to organization izhgvbkzxgrnfbdynfik
# Prerequisites:
#   1. Personal access token from https://supabase.com/dashboard/account/tokens
#   2. Run in PowerShell:  $env:SUPABASE_ACCESS_TOKEN = "sbp_...."
#   3. Optional for data copy: $env:OLD_DB_PASSWORD = "password of OLD project DB"
#
# Usage:  cd E:\WEBBOT\PLATFORMA
#         .\scripts\migrate-supabase-org.ps1

$ErrorActionPreference = "Stop"
$TargetOrgId = "izhgvbkzxgrnfbdynfik"
$ProjectName = "ayda-umnichka"
$Region = "eu-central-1"
$OldProjectRef = "ljixwbcwhmqekrssbsqg"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Invoke-Supabase {
    param([string[]]$Args)
    & npx --yes supabase@latest @Args
    if ($LASTEXITCODE -ne 0) { throw "supabase failed: $($Args -join ' ')" }
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host @"

Требуется токен Supabase (аккаунт с доступом к org izhgvbkzxgrnfbdynfik):

  1. Откройте https://supabase.com/dashboard/account/tokens
  2. Создайте токен (Scopes: все для org / projects)
  3. В PowerShell ВНЕ агента выполните:

     `$env:SUPABASE_ACCESS_TOKEN = 'sbp_ваш_токен'
     cd E:\WEBBOT\PLATFORMA
     .\scripts\migrate-supabase-org.ps1

Либо одной строкой:
     `$env:SUPABASE_ACCESS_TOKEN='...'; .\scripts\migrate-supabase-org.ps1

"@ -ForegroundColor Yellow
    exit 1
}

Write-Host "Checking organizations..." -ForegroundColor Cyan
$orgsJson = Invoke-Supabase @("orgs", "list", "-o", "json") | Out-String
$orgs = $orgsJson | ConvertFrom-Json
$targetOrg = $orgs | Where-Object { $_.id -eq $TargetOrgId }
if (-not $targetOrg) {
    Write-Host "Текущий токен не видит org $TargetOrgId. Войдите под аккаунтом владельца новой организации." -ForegroundColor Red
    Write-Host ("Доступные orgs: " + (($orgs | ForEach-Object { "$($_.name) ($($_.id))" }) -join ', '))
    exit 1
}
Write-Host "OK: org $($targetOrg.name)" -ForegroundColor Green

Write-Host "Creating project '$ProjectName' in target org (if not exists)..." -ForegroundColor Cyan
$dbPassword = if ($env:NEW_DB_PASSWORD) { $env:NEW_DB_PASSWORD } else { "AidaUm_" + [guid]::NewGuid().ToString("N").Substring(0, 12) + "!" }
try {
    $createOut = Invoke-Supabase @(
        "projects", "create", $ProjectName,
        "--org-id", $TargetOrgId,
        "--region", $Region,
        "--db-password", $dbPassword,
        "--yes", "--agent", "no",
        "-o", "json"
    ) | Out-String
    $created = $createOut | ConvertFrom-Json
    $newRef = $created.id
    Write-Host "Created project ref: $newRef" -ForegroundColor Green
    Write-Host "SAVE DB PASSWORD: $dbPassword" -ForegroundColor Yellow
} catch {
    Write-Host "Create skipped or failed (project may already exist). Listing projects..." -ForegroundColor Yellow
    $listJson = Invoke-Supabase @("projects", "list", "-o", "json") | Out-String
    $projects = $listJson | ConvertFrom-Json
    $existing = $projects | Where-Object { $_.organization_id -eq $TargetOrgId -and $_.name -eq $ProjectName }
    if (-not $existing) {
        $existing = $projects | Where-Object { $_.organization_id -eq $TargetOrgId } | Select-Object -First 1
    }
    if (-not $existing) { throw "No project found in target org. Create manually in dashboard." }
    $newRef = $existing.ref
    Write-Host "Using existing project ref: $newRef" -ForegroundColor Green
}

Write-Host "Waiting for project to become healthy..." -ForegroundColor Cyan
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 15
    $listJson = Invoke-Supabase @("projects", "list", "-o", "json") | Out-String
    $p = ($listJson | ConvertFrom-Json) | Where-Object { $_.ref -eq $newRef }
    if ($p -and $p.status -eq "ACTIVE_HEALTHY") { break }
    Write-Host "  status: $($p.status) ..."
}
if ($p.status -ne "ACTIVE_HEALTHY") { throw "Project not healthy: $($p.status)" }

Write-Host "Linking local supabase/ to $newRef ..." -ForegroundColor Cyan
$configPath = Join-Path $Root "supabase\config.toml"
(Get-Content $configPath -Raw) -replace 'project_id = "[^"]+"', "project_id = `"$newRef`"" | Set-Content $configPath -NoNewline

Invoke-Supabase @("link", "--project-ref", $newRef, "--yes", "--agent", "no")

Write-Host "Applying migrations (db push)..." -ForegroundColor Cyan
Invoke-Supabase @("db", "push", "--remote", "--yes", "--agent", "no")

Write-Host "Fetching API keys..." -ForegroundColor Cyan
$keysJson = Invoke-Supabase @("projects", "api-keys", "--project-ref", $newRef, "-o", "json") | Out-String
$keys = $keysJson | ConvertFrom-Json
$anon = ($keys | Where-Object { $_.name -eq "anon" }).api_key
$service = ($keys | Where-Object { $_.name -eq "service_role" }).api_key
$url = "https://$newRef.supabase.co"

if (-not $anon -or -not $service) { throw "Could not read API keys" }

$envLocal = Join-Path $Root ".env.local"
$content = Get-Content $envLocal -Raw -ErrorAction SilentlyContinue
if (-not $content) { $content = "" }

$content = $content -replace 'NEXT_PUBLIC_SUPABASE_URL="[^"]*"', "NEXT_PUBLIC_SUPABASE_URL=`"$url`""
$content = $content -replace 'NEXT_PUBLIC_SUPABASE_ANON_KEY="[^"]*"', "NEXT_PUBLIC_SUPABASE_ANON_KEY=`"$anon`""
$content = $content -replace 'SUPABASE_SERVICE_ROLE_KEY="[^"]*"', "SUPABASE_SERVICE_ROLE_KEY=`"$service`""

if ($content -notmatch "NEXT_PUBLIC_SUPABASE_URL") {
    $content += "`nNEXT_PUBLIC_SUPABASE_URL=`"$url`"`nNEXT_PUBLIC_SUPABASE_ANON_KEY=`"$anon`"`nSUPABASE_SERVICE_ROLE_KEY=`"$service`"`n"
}

Set-Content -Path $envLocal -Value $content -Encoding UTF8
Write-Host "Updated .env.local" -ForegroundColor Green

Write-Host @"

Next steps (data from old project $OldProjectRef):
  A) Dashboard: старый проект → Database → Backups → download, новый → Restore
  B) Or set `$env:OLD_DB_PASSWORD and run pg_dump (see Supabase docs)

Vercel (production):
  npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
  npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
  npx vercel env add SUPABASE_SERVICE_ROLE_KEY production

New project: $url
Dashboard: https://supabase.com/dashboard/project/$newRef

"@ -ForegroundColor Cyan
