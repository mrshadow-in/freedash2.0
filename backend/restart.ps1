# Restart Backend Script
Write-Host "Stopping backend server..." -ForegroundColor Yellow

# Find and kill process on port 3000
$processId = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess
if ($processId) {
    Stop-Process -Id $processId -Force
    Write-Host "Stopped old backend process" -ForegroundColor Green
} else {
    Write-Host "No process found on port 3000" -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

# Start backend
Write-Host "Starting backend server..." -ForegroundColor Cyan
npm start
