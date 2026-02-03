# Migration Guide

## Overview

This document explains how the original repository structure was migrated to a monorepo.

## Before (Original Structure)

```
handwriting/
├── frontend/              # Next.js app
├── synthesis_api/         # Python API
└── ref2/                  # Python ML library
```

Each directory was independent with its own dependencies and configuration.

## After (Monorepo Structure)

```
handwriting/
├── monorepo/              # NEW: Monorepo root
│   ├── apps/
│   │   ├── frontend/      # Copied from ../frontend
│   │   ├── synthesis-api/ # Copied from ../synthesis_api
│   │   └── ref2/          # Copied from ../ref2
│   ├── packages/
│   │   └── shared-config/ # NEW: Shared utilities
│   ├── package.json       # Root workspace config
│   └── turbo.json         # Turbo pipelines
├── frontend/              # KEPT: Original (unchanged)
├── synthesis_api/         # KEPT: Original (unchanged)
└── ref2/                  # KEPT: Original (unchanged)
```

**Important**: Original directories were NOT modified or deleted. They remain as-is for reference.

## What Changed

### 1. Frontend Package

**Before** (`frontend/package.json`):
```json
{
  "name": "frontend",
  "packageManager": "npm@10.8.2"
}
```

**After** (`monorepo/apps/frontend/package.json`):
```json
{
  "name": "@handwriting/frontend",
  "dependencies": {
    "@monorepo/shared": "workspace:*",
    // ... existing deps
  }
  // Removed packageManager field (uses Bun now)
}
```

**Changes**:
- ✅ Scoped package name: `@handwriting/frontend`
- ✅ Added dependency on shared package
- ✅ Added `check` script for type checking
- ✅ Removed npm package manager constraint

### 2. Python Apps

**New files added**:

`monorepo/apps/synthesis-api/package.json`:
```json
{
  "name": "@handwriting/synthesis-api",
  "scripts": {
    "dev": "python main.py",
    "install": "pip install -r requirements.txt",
    "check": "python -m py_compile *.py"
  }
}
```

`monorepo/apps/ref2/package.json`:
```json
{
  "name": "@handwriting/ref2",
  "scripts": {
    "dev": "python main.py",
    "install": "pip install -r requirements.txt",
    "check": "python -m py_compile *.py"
  }
}
```

**Purpose**: Makes Python apps compatible with Bun workspaces and Turbo.

### 3. Shared Package (New)

Created `packages/shared-config/` with:

**package.json**:
```json
{
  "name": "@monorepo/shared",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

**src/index.ts**:
```typescript
export const MONOREPO_NAME = "@handwriting/monorepo";
export interface SharedConfig { /* ... */ }
export const getSharedConfig = () => { /* ... */ };
export const logSharedMessage = (msg: string) => { /* ... */ };
```

**Purpose**: Demonstrates workspace connectivity and provides shared utilities.

### 4. Frontend Code Changes

**File**: `apps/frontend/src/app/page.tsx`

**Added import**:
```typescript
import { logSharedMessage, MONOREPO_NAME } from "@monorepo/shared";
```

**Added logging** (development only):
```typescript
if (process.env.NODE_ENV === "development") {
  logSharedMessage(`Frontend loaded successfully from ${MONOREPO_NAME}`);
}
```

**Purpose**: Proves that workspace linking works correctly.

## Migration Steps Performed

1. ✅ Created `monorepo/` directory structure
2. ✅ Initialized root `package.json` with workspaces
3. ✅ Installed Turbo as dev dependency
4. ✅ Created `turbo.json` with pipelines
5. ✅ Created `packages/shared-config` package
6. ✅ Copied `frontend/` to `apps/frontend/`
7. ✅ Copied `synthesis_api/` to `apps/synthesis-api/`
8. ✅ Copied `ref2/` to `apps/ref2/`
9. ✅ Updated frontend package.json
10. ✅ Added package.json to Python apps
11. ✅ Updated frontend code to import shared package
12. 🔄 Running `bun install` (in progress)

## Validation Checklist

After `bun install` completes, verify:

- [ ] `node_modules/@monorepo/shared` exists (workspace linked)
- [ ] `bun dev` starts all apps with TUI
- [ ] Frontend imports from `@monorepo/shared` without errors
- [ ] TypeScript IntelliSense works for shared package
- [ ] `bun run check` passes for all TS packages
- [ ] Frontend dev server runs on expected port
- [ ] Python apps can still run independently

## Rollback Plan

If the monorepo doesn't work, the original directories are untouched:

```bash
cd ../frontend
npm install
npm run dev
```

Nothing was deleted or permanently modified.

## Next Steps

### 1. Complete Installation

Wait for `bun install` to finish, then:

```bash
cd monorepo
bun dev
```

### 2. Verify Workspace Linking

Check that the shared package is linked:

```bash
ls -la node_modules/@monorepo/shared
# Should show a symlink to ../../packages/shared-config
```

### 3. Test Frontend Import

Start the frontend and check the console:

```bash
cd apps/frontend
bun dev
```

Should log: `[@ handwriting/monorepo] Frontend loaded successfully from @handwriting/monorepo`

### 4. Configure Environment Variables

Copy `.env.example` from original frontend:

```bash
cp ../../frontend/.env.example apps/frontend/.env
```

Update paths if needed.

### 5. Update Git Ignore

The monorepo has its own `.gitignore`. Ensure it covers:
- `node_modules/`
- `.turbo/`
- `.next/`
- `__pycache__/`
- `.env`

### 6. Commit Monorepo

```bash
cd monorepo
git init
git add .
git commit -m "Initial monorepo setup with Turbo + Bun"
```

Or add to existing repo:

```bash
cd ..
git add monorepo/
git commit -m "Add monorepo structure"
```

## Common Issues

### Issue: Workspace not linking

**Symptom**: Import errors for `@monorepo/shared`

**Solution**:
```bash
rm -rf node_modules
bun install
```

### Issue: Python apps not running

**Symptom**: `bun dev` doesn't start Python apps

**Solution**: Install Python dependencies first:
```bash
cd apps/synthesis-api
pip install -r requirements.txt
cd ../ref2
pip install -r requirements.txt
```

### Issue: Turbo cache pollution

**Symptom**: Stale builds

**Solution**:
```bash
bun run clean
rm -rf .turbo
bun run build
```

### Issue: Port conflicts

**Symptom**: "Port already in use"

**Solution**: Check `turbo.json` and update ports, or kill existing processes:
```bash
lsof -ti:3000 | xargs kill -9  # Linux/Mac
netstat -ano | findstr :3000   # Windows
```

## Benefits of Migration

### Before (Separate Repos)

- ❌ Duplicate dependencies across projects
- ❌ Manual coordination of shared code
- ❌ Separate builds for each app
- ❌ No type sharing between frontend/API
- ❌ Harder to maintain consistency

### After (Monorepo)

- ✅ Unified dependency management
- ✅ Shared code via workspace packages
- ✅ Orchestrated builds with Turbo
- ✅ Type-safe imports across packages
- ✅ Consistent tooling and configuration
- ✅ Single `bun dev` to run everything
- ✅ Faster installs with Bun

## Questions?

- 📖 See `README.md` for usage guide
- 🏗️ See `ARCHITECTURE.md` for design decisions
- 🐛 Check "Common Issues" section above
