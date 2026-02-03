#!/bin/bash
# Monorepo setup script

echo "🚀 Setting up handwriting monorepo..."

# Install JS dependencies
echo "📦 Installing JavaScript dependencies..."
bun install

# Install Python dependencies
echo "🐍 Installing Python dependencies for synthesis-api..."
cd apps/synthesis-api && pip install -r requirements.txt && cd ../..

echo "🐍 Installing Python dependencies for ref2..."
cd apps/ref2 && pip install -r requirements.txt && cd ../..

# Generate Prisma client (optional, if you need it)
echo "🗄️  Generating Prisma client (optional)..."
cd apps/frontend && bunx prisma generate && cd ../..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  - Copy .env files: cp apps/frontend/.env.example apps/frontend/.env"
echo "  - Run dev servers: bun dev"
echo "  - Run type check: bun run check"
