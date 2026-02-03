# Handwriting Monorepo

A Turbo + Bun powered monorepo for the handwriting synthesis platform.

## Structure

```
monorepo/
├── apps/
│   ├── frontend/          # Next.js frontend (@handwriting/frontend)
│   ├── synthesis-api/     # Python API for synthesis (@handwriting/synthesis-api)
│   └── ref2/              # Python reference implementation (@handwriting/ref2)
├── packages/
│   └── shared-config/     # Shared TypeScript utilities (@monorepo/shared)
├── package.json           # Root workspace config
└── turbo.json             # Turbo pipeline configuration
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0
- Python >= 3.11 (for Python apps)
- Node.js >= 18.0.0

### Installation

```bash
# Install all workspace dependencies
bun install

# Install Python dependencies for each Python app
cd apps/synthesis-api
pip install -r requirements.txt
cd ../ref2
pip install -r requirements.txt
cd ../..
```

> **Note:** The Python `install` scripts were removed from package.json to avoid conflicts with Bun's install process. Install Python dependencies manually as shown above.

## Development

### Run all apps in parallel with TUI

```bash
bun dev
```

This launches Turbo's Terminal UI showing all running apps.

### Run individual apps

```bash
# Frontend (Next.js)
cd apps/frontend
bun dev

# Synthesis API (Python)
cd apps/synthesis-api
python main.py

# Ref2 (Python)
cd apps/ref2
python main.py

# Inngest Dev Server (for background jobs)
bun run dev:inngest
```

### Background Jobs with Inngest

The frontend uses Inngest for background job processing (bulk generation, etc.).

**Development setup:**

1. Start the frontend dev server:
   ```bash
   cd apps/frontend
   bun dev
   ```

2. In a separate terminal, start Inngest dev server:
   ```bash
   bun run dev:inngest
   ```

3. Access Inngest dashboard at: `http://localhost:8288`

The Inngest dev server provides:
- Live function execution monitoring
- Event replay and debugging
- Function logs and metrics
- Test event triggering

## Build

```bash
# Build all apps
bun run build

# Build specific app
bun run build --filter=@handwriting/frontend
```

## Type Checking

```bash
# Check all TypeScript packages
bun run check
```

## Workspaces

This monorepo uses **Bun native workspaces** with the following packages:

### Apps

- **@handwriting/frontend**: Next.js 15 frontend with tRPC, Prisma, NextAuth
- **@handwriting/synthesis-api**: Python API for handwriting synthesis
- **@handwriting/ref2**: Core handwriting synthesis ML implementation

### Packages

- **@monorepo/shared**: Shared TypeScript configuration and utilities

### Workspace Protocol

The frontend imports the shared package using the workspace protocol:

```json
{
  "dependencies": {
    "@monorepo/shared": "workspace:*"
  }
}
```

This enables hot-reloading and type-safe imports across packages.

## Pipeline Configuration

Turbo pipelines are defined in `turbo.json`:

- **build**: Builds all apps with dependency awareness
- **dev**: Runs all dev servers (persistent, no cache)
- **check**: Type-checking for TypeScript packages

## Migration Guide

The monorepo was created from three separate directories:

1. **frontend/** → **apps/frontend/**
2. **synthesis_api/** → **apps/synthesis-api/**
3. **ref2/** → **apps/ref2/**

The original directories remain unchanged for reference.

## Features

- ⚡ **Bun workspaces**: Native workspace support, fast installs
- 🚀 **Turbo**: Incremental builds, task caching, parallel execution
- 📦 **Modern exports**: ESM-first with package.json `exports` field
- 🔧 **TypeScript**: Full type safety across JS/TS packages
- 🐍 **Python support**: Python apps integrated into monorepo structure
- 🎨 **TUI**: Visual task runner with `turbo dev --ui`

## Commands Reference

| Command | Description |
|---------|-------------|
| `bun dev` | Run all apps with Turbo TUI |
| `bun run build` | Build all apps |
| `bun run check` | Type-check TypeScript packages |
| `bun run clean` | Clean build artifacts |

## Next Steps

1. Configure environment variables for each app
2. Set up CI/CD pipelines using Turbo's remote caching
3. Add shared UI component library in `packages/ui`
4. Add shared types package for API contracts
5. Consider containerizing Python apps with Docker

## License

See individual app directories for license information.
