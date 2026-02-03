# Install Python dependencies for all Python apps
# PowerShell version

Write-Host "🐍 Installing Python dependencies..." -ForegroundColor Cyan

Write-Host ""
Write-Host "📦 Installing synthesis-api dependencies..." -ForegroundColor Yellow
Set-Location apps\synthesis-api
pip install -r requirements.txt

Write-Host ""
Write-Host "📦 Installing ref2 dependencies..." -ForegroundColor Yellow
Set-Location ..\ref2
pip install -r requirements.txt

Set-Location ..\..

Write-Host ""
Write-Host "✅ Python dependencies installed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Copy .env: copy ..\frontend\.env apps\frontend\.env"
Write-Host "  2. Run: bun dev"
