# Setup Python environment for handwriting monorepo
# This creates a conda environment with Python 3.11 and installs all dependencies

Write-Host "🐍 Setting up Python environment for handwriting monorepo..." -ForegroundColor Cyan
Write-Host ""

# Create conda environment with Python 3.11
Write-Host "📦 Creating conda environment 'handwriting-monorepo' with Python 3.11..." -ForegroundColor Yellow
conda create -n handwriting-monorepo python=3.11 -y

# Activate environment
Write-Host ""
Write-Host "🔧 Activating environment..." -ForegroundColor Yellow
conda activate handwriting-monorepo

# Install synthesis-api dependencies    
Write-Host ""
Write-Host "📦 Installing synthesis-api dependencies..." -ForegroundColor Yellow
Set-Location apps\synthesis-api
pip install -r requirements.txt

# Install ref2 dependencies
Write-Host ""
Write-Host "📦 Installing ref2 dependencies..." -ForegroundColor Yellow
Set-Location ..\ref2
pip install -r requirements.txt

Set-Location ..\..

Write-Host ""
Write-Host "✅ Python environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To use the environment:" -ForegroundColor Cyan
Write-Host "  1. Activate: conda activate handwriting-monorepo"
Write-Host "  2. Run: bun dev"
Write-Host ""
Write-Host "The environment will be used automatically when you run 'bun dev'"
