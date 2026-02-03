# Development Guide

## Running the Full Stack

### Option 1: All Services with Turbo (Recommended)

```bash
bun dev
```

This starts:
- Frontend (Next.js) on `http://localhost:3000`
- Synthesis API (Python) on `http://localhost:8001`
- Ref2 (Python ML)

**Note:** This does NOT include Inngest. See below to add it.

### Option 2: Individual Services

**Terminal 1 - Frontend:**
```bash
cd apps/frontend
bun dev
```
- Frontend: `http://localhost:3000`

**Terminal 2 - Inngest (Required for background jobs):**
```bash
bun run dev:inngest
```
- Inngest Dashboard: `http://localhost:8288`
- Automatically connects to `http://localhost:3000/api/inngest`

**Important:** Make sure the frontend (Terminal 1) is running first before starting Inngest!

**Terminal 3 - Synthesis API (Optional):**
```bash
cd apps/synthesis-api
conda activate handwriting-monorepo  # If using conda
python main.py
```
- API: `http://localhost:8001`

**Terminal 4 - Ref2 (Optional):**
```bash
cd apps/ref2
conda activate handwriting-monorepo  # If using conda
python main.py
```

## Environment Setup

### 1. Install Dependencies

**JavaScript/TypeScript:**
```bash
bun install
```

**Python (using conda environment):**
```bash
# Create conda environment with Python 3.11
conda create -n handwriting-monorepo python=3.11 -y
conda activate handwriting-monorepo

# Install synthesis-api dependencies
cd apps/synthesis-api
pip install -r requirements.txt

# Install ref2 dependencies
cd ../ref2
pip install -r requirements.txt
```

### 2. Environment Variables

Copy `.env.example` to `.env` in the frontend:

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Auth secret key
- `NEXTAUTH_URL` - Auth URL (http://localhost:3000)
- And more... (see `.env.example`)

### 3. Database Setup

```bash
cd apps/frontend

# Push schema to database
bun db:push

# Or run migrations
bun db:generate
bun db:migrate

# Open Prisma Studio to view data
bun db:studio
```

## Development Workflows

### Working on Frontend Only

If you're only working on the frontend UI:

```bash
# Terminal 1: Frontend
cd apps/frontend
bun dev

# Terminal 2: Inngest (needed for bulk jobs)
bun run dev:inngest
```

You can mock the Python API calls or work without them.

### Working on Bulk Processing

Bulk generation uses Inngest for background jobs:

1. **Start Frontend:**
   ```bash
   cd apps/frontend
   bun dev
   ```

2. **Start Inngest:**
   ```bash
   bun run dev:inngest
   ```

3. **Monitor Jobs:**
   - Inngest Dashboard: `http://localhost:8288`
   - Watch function executions in real-time
   - Replay failed events
   - Test events manually

### Working on Synthesis API

If you're working on the ML/synthesis:

1. **Activate Conda Environment:**
   ```bash
   conda activate handwriting-monorepo
   ```

2. **Start Synthesis API:**
   ```bash
   cd apps/synthesis-api
   python main.py
   ```

3. **Test API:**
   ```bash
   curl http://localhost:8001/health
   ```

## Common Commands

### Root Level

```bash
bun dev                 # All apps with TUI
bun run dev:inngest     # Inngest dev server
bun run dev:frontend    # Frontend only
bun run build           # Build all
bun run check           # Type check all
bun run clean           # Clean builds
```

### Frontend

```bash
cd apps/frontend

bun dev                 # Dev server
bun run dev:inngest     # Inngest server
bun build               # Production build
bun run check           # Type check
bun db:push             # Push schema
bun db:studio           # Prisma Studio
```

### Python Apps

```bash
conda activate handwriting-monorepo

cd apps/synthesis-api
python main.py          # Start API

cd apps/ref2
python main.py          # Run synthesis
```

## Troubleshooting

### Inngest not connecting

**Problem:** Frontend can't connect to Inngest

**Solution:**
1. Ensure Inngest dev server is running: `bun run dev:inngest`
2. Check `http://localhost:8288` is accessible
3. Verify `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` in `.env`

### Python dependencies missing

**Problem:** `ModuleNotFoundError: No module named 'tensorflow'`

**Solution:**
1. Activate conda environment: `conda activate handwriting-monorepo`
2. Install dependencies: `pip install -r requirements.txt`
3. Run with conda: `conda run -n handwriting-monorepo python main.py`

### Database connection failed

**Problem:** `P1001: Can't reach database server`

**Solution:**
1. Ensure PostgreSQL is running
2. Check `DATABASE_URL` in `.env`
3. Start database: `./start-database.sh` (if using local Docker)

### Port already in use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :3000   # Windows

# Or change port
PORT=3001 bun dev
```

## Tips

### Hot Reload

- **Frontend:** Auto-reloads on file changes
- **Python:** Manual restart required
- **Inngest:** Auto-reloads functions on file changes

### Debugging Inngest Functions

1. Go to `http://localhost:8288`
2. Click on your function
3. View execution logs
4. Test with sample events
5. Replay failed events

### Testing Bulk Jobs

1. Download sample CSV: Click "Download Sample CSV" in bulk UI
2. Upload the CSV file
3. Configure settings (style, bias, etc.)
4. Start job
5. Monitor in Inngest dashboard at `http://localhost:8288`

### Database Inspection

```bash
cd apps/frontend
bun db:studio
```

Opens Prisma Studio at `http://localhost:5555`

## Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (Next.js)                     │
│  - http://localhost:3000                │
│  - UI, tRPC, Auth                       │
└──────────────┬──────────────────────────┘
               │
               ├──→ Inngest (Background Jobs)
               │    - http://localhost:8288
               │    - Bulk generation, async tasks
               │
               ├──→ Synthesis API (Python)
               │    - http://localhost:8001
               │    - FastAPI, ML inference
               │
               └──→ Database (PostgreSQL)
                    - Prisma ORM
                    - User data, jobs, credits
```

## Next Steps

- [ ] Set up production environment variables
- [ ] Configure remote caching for Turbo
- [ ] Set up CI/CD pipeline
- [ ] Deploy Inngest to production (Inngest Cloud)
- [ ] Containerize Python services with Docker
