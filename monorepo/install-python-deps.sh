#!/bin/bash
# Install Python dependencies for all Python apps

echo "🐍 Installing Python dependencies..."

echo ""
echo "📦 Installing synthesis-api dependencies..."
cd apps/synthesis-api
pip install -r requirements.txt

echo ""
echo "📦 Installing ref2 dependencies..."
cd ../ref2
pip install -r requirements.txt

echo ""
echo "✅ Python dependencies installed!"
echo ""
echo "Next steps:"
echo "  1. Copy .env: cp ../frontend/.env apps/frontend/.env"
echo "  2. Run: bun dev"
