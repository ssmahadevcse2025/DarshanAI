# DarshanAI - Git Pull & Sync Utility for PowerShell
param (
    [switch]$NoPause
)

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "       DarshanAI - Team Repository Sync Utility        " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Git is not found in your PATH." -ForegroundColor Red
    Write-Host "Please install Git or add it to system environment variables." -ForegroundColor Red
    exit 1
}

Write-Host "[1/2] Fetching and syncing latest changes from GitHub (origin/main)..." -ForegroundColor Cyan
git pull --autostash origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Git pull failed. Please review merge conflict messages above." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`n[2/2] Repository is up to date! Latest commit:" -ForegroundColor Green
git log -n 1 --oneline --decorate

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "   SUCCESS: Ready to work on DarshanAI in Antigravity!  " -ForegroundColor Green
Write-Host "=======================================================`n" -ForegroundColor Green

if (-not $NoPause -and ($Host.Name -eq 'ConsoleHost')) {
    Read-Host "Press Enter to continue..."
}
