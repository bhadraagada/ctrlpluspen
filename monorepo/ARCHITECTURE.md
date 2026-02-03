# Monorepo Architecture

## Overview

This monorepo follows a **hybrid architecture** that combines JavaScript/TypeScript apps with Python ML services using Turbo + Bun workspaces.

## Design Decisions

### 1. Workspace Layout

```
apps/       - Applications (frontend, APIs)
packages/   - Shared libraries and utilities
```

This follows the standard Turbo monorepo convention and makes it easy to:
- Scale with new apps
- Share code between apps
- Manage dependencies centrally

### 2. Bun Native Workspaces

We use Bun's built-in workspace support instead of npm/yarn/pnpm because:
- **Speed**: 10-100x faster installs
- **Native support**: No additional configuration needed
- **Modern**: ESM-first, supports workspace protocol
- **TypeScript**: First-class TS support without transpilation

### 3. Turbo Pipelines

Turbo orchestrates all build tasks across the monorepo:

```json
{
  "build": {
    "dependsOn": ["^build"],  // Build dependencies first
    "outputs": [".next/**", "dist/**"]
  },
  "dev": {
    "cache": false,           // No caching for dev servers
    "persistent": true        // Keep running
  }
}
```

Benefits:
- **Incremental builds**: Only rebuild changed packages
- **Parallel execution**: Run multiple tasks concurrently
- **Task caching**: Skip work that's already been done
- **Dependency graph**: Automatic task ordering

### 4. Modern Package Exports

The shared package uses the modern `exports` field:

```json
{
  "exports": {
    ".": "./src/index.ts"
  }
}
```

This enables:
- **Direct TS imports**: No build step needed in dev
- **Hot reloading**: Changes propagate instantly
- **Type safety**: Full IntelliSense across packages
- **ESM/CJS dual support**: (future-ready)

## Package Architecture

### @monorepo/shared

**Purpose**: Shared configuration, types, and utilities

**Exports**:
- `MONOREPO_NAME`: Constant for branding
- `VERSION`: Current version
- `SharedConfig`: Type-safe config interface
- `getSharedConfig()`: Environment-aware config
- `logSharedMessage()`: Branded logging utility

**Usage Example**:
```typescript
import { logSharedMessage, MONOREPO_NAME } from "@monorepo/shared";

logSharedMessage(`App started from ${MONOREPO_NAME}`);
```

### @handwriting/frontend

**Tech Stack**:
- Next.js 15 (App Router)
- React 19
- tRPC for type-safe API
- Prisma ORM
- NextAuth for authentication
- TailwindCSS 4
- TypeScript 5.8

**Dependencies**:
- `@monorepo/shared`: Workspace link for shared utils

### @handwriting/synthesis-api (Python)

**Purpose**: REST API for handwriting synthesis

**Integration**:
- Has a `package.json` for workspace compatibility
- Uses `scripts.dev` to run Python server
- Can be orchestrated by Turbo alongside JS apps

### @handwriting/ref2 (Python)

**Purpose**: Core ML implementation for handwriting synthesis

**Integration**:
- TensorFlow-based model
- Accessible to synthesis-api
- Can be run via Turbo's dev command

## Workflow Patterns

### Development Flow

1. **Start all apps**:
   ```bash
   bun dev
   ```
   Turbo starts all dev servers in parallel with TUI

2. **Make changes to shared package**:
   - Changes auto-reload in frontend
   - No build step needed (direct TS imports)

3. **Type checking**:
   ```bash
   bun run check
   ```
   Validates TypeScript across all packages

### Build Flow

1. **Build shared package** (if needed)
2. **Build frontend** (depends on shared)
3. **Python apps** (handled separately)

Turbo automatically determines the correct order based on dependencies.

## Future Enhancements

### 1. Shared UI Library

```
packages/ui/
  ├── components/
  │   ├── Button.tsx
  │   ├── Input.tsx
  │   └── Card.tsx
  ├── package.json
  └── tsconfig.json
```

Reusable React components with Tailwind styling.

### 2. Shared Types Package

```
packages/types/
  ├── api.ts          # API request/response types
  ├── models.ts       # Database models
  └── synthesis.ts    # ML model types
```

Shared between frontend and synthesis-api for type safety.

### 3. Python Package Management

Consider adding:
- `pyproject.toml` at root for unified Python deps
- Poetry or PDM for better Python workspace support
- Shared Python utilities package

### 4. Docker Integration

```
apps/synthesis-api/Dockerfile
apps/ref2/Dockerfile
docker-compose.yml
```

Containerize Python services for consistent deployment.

### 5. Remote Caching

Enable Turbo's remote cache (Vercel or custom S3):
```bash
turbo login
turbo link
```

Share build cache across team and CI/CD.

### 6. CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
jobs:
  build:
    - uses: actions/checkout@v3
    - uses: oven-sh/setup-bun@v1
    - run: bun install
    - run: bun run build
    - run: bun run check
```

## Recommendations

### Immediate Next Steps

1. **Complete `bun install`**: Let the initial install finish
2. **Test workspace linking**: Verify `@monorepo/shared` imports work
3. **Run dev servers**: Test `bun dev` to ensure all apps start
4. **Configure .env files**: Set up environment variables for each app

### Short-term Improvements

1. **Add shared types**: Create `packages/types` for API contracts
2. **Standardize scripts**: Ensure all packages have consistent npm scripts
3. **Add linting**: ESLint + Prettier configuration
4. **Add testing**: Vitest for unit tests, Playwright for E2E

### Long-term Strategy

1. **Micro-frontend**: Split frontend into smaller apps if it grows
2. **API gateway**: Add a unified gateway for all Python services
3. **Shared component library**: Extract reusable UI components
4. **Design system**: Tokens and theming in shared package
5. **Monorepo tooling**: Add custom scripts for scaffolding new packages

## Performance Considerations

### Bun Advantages

- **Fast installs**: Workspaces link instantly
- **Low memory**: Efficient package resolution
- **Native TS**: No transpilation in dev mode

### Turbo Advantages

- **Incremental builds**: Only rebuild what changed
- **Parallel tasks**: Utilize all CPU cores
- **Smart caching**: Hash-based cache invalidation

### Trade-offs

- **Initial setup**: More complex than single-app
- **Learning curve**: Team needs to understand workspaces
- **Tooling compatibility**: Some tools may not support workspaces well

## Troubleshooting

### Workspace not linking

```bash
rm -rf node_modules
bun install
```

### TypeScript errors in shared package

```bash
cd packages/shared-config
bun run check
```

### Turbo cache issues

```bash
bun run clean
rm -rf .turbo
bun run build
```

## Resources

- [Turbo Documentation](https://turbo.build/repo/docs)
- [Bun Workspaces](https://bun.sh/docs/install/workspaces)
- [Package Exports](https://nodejs.org/api/packages.html#exports)
