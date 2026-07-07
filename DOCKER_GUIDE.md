# Docker Development Guide for Tadkar Monorepo

## Quick Start

### Prerequisites
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2+ (included in Docker Desktop)

### Development Mode
```bash
# Start both API and Web services with hot reload
docker compose up

# Start only API service
docker compose up api

# Start only Web service
docker compose up web

# Build and start (force rebuild)
docker compose up --build

# Run in background
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes (fresh start)
docker compose down -v
```

### Access Services
- **API**: http://localhost:3000
- **Web**: http://localhost:4200

## Architecture

### Dockerfile Stages
1. **base** - Node 20 Alpine + corepack + pnpm
2. **dependencies** - Fetch and install all dependencies (cached layer)
3. **development** - Full workspace with source code for live reload
4. **builder** - Production build stage
5. **production** - Minimal production image

### Volume Strategy
The setup uses **isolated volumes** for each service to prevent conflicts:

```
Host                    Container                 Purpose
─────────────────────────────────────────────────────────────
.                       /workspace                Source code (live reload)
api-node-modules        /workspace/node_modules   API dependencies
web-node-modules        /workspace/node_modules   Web dependencies
pnpm-store              /pnpm/store               Shared pnpm cache
```

**Why isolated volumes?**
- Prevents Windows/Linux filesystem conflicts
- Each service gets its own `node_modules`
- Source mount overrides container's `/workspace`, but named volumes persist
- The `- /workspace/node_modules` line excludes `node_modules` from the source mount

### Layer Caching Strategy
```
Layer 1: Base image (Node + pnpm)          → Rarely changes
Layer 2: package.json files only           → Changes with dependencies
Layer 3: pnpm fetch + install              → Cached if lockfile unchanged
Layer 4: Source code                       → Changes frequently
```

This means:
- First build: ~2-3 minutes (installs all dependencies)
- Subsequent builds: ~10-30 seconds (only rebuilds changed layers)
- Code-only changes: ~5 seconds (skips dependency install)

## Common Tasks

### Install New Dependencies
```bash
# From host (recommended)
pnpm add <package>

# Then rebuild containers to pick up changes
docker compose up --build
```

### Run Commands in Container
```bash
# Open shell in API container
docker compose exec api sh

# Open shell in Web container
docker compose exec web sh

# Run pnpm command
docker compose exec api pnpm <command>

# Run database migrations
docker compose exec api pnpm --filter @tadkar/api prisma:ensure
docker compose exec api pnpm --filter @tadkar/api exec prisma db push
```

### Database Operations
```bash
# Setup database (first time)
docker compose exec api pnpm --filter @tadkar/api prisma:ensure
docker compose exec api pnpm --filter @tadkar/api exec prisma db push --skip-generate --schema prisma/prototype.prisma
docker compose exec api pnpm --filter @tadkar/api seed

# Re-seed database
docker compose exec api pnpm --filter @tadkar/api seed
```

### View Logs
```bash
# All services
docker compose logs

# Follow API logs
docker compose logs -f api

# Follow Web logs
docker compose logs -f web
```

### Clean Build
```bash
# Remove all containers, images, and volumes
docker compose down -v --rmi all

# Rebuild from scratch
docker compose up --build
```

## Production Build

### Build Production Image
```bash
# Build for production
docker build --target production -t tadkar-api:latest .
```

### Production Dockerfile
The `docker/` directory contains optimized Dockerfiles for production:

- `docker/api.Dockerfile` - API-only production image
- `docker/web.Dockerfile` - Web-only production image with Nginx

### Run Production
```bash
# Using production Dockerfiles
docker compose -f docker-compose.prod.yml up
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :3000

# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Map host port 3001 to container port 3000
```

### node_modules Conflicts
```bash
# Remove all volumes and rebuild
docker compose down -v
docker compose up --build
```

### pnpm Store Issues
```bash
# Clear pnpm store
docker compose down -v
docker volume rm tadkar-rebuild_pnpm-store
docker compose up --build
```

### File Watching Not Working
Ensure `CHOKIDAR_USEPOLLING` is set to `"true"` in docker-compose.yml.

### Container Can't Find Dependencies
```bash
# Reinstall dependencies
docker compose exec api pnpm install
docker compose exec web pnpm install
```

## Performance Tips

1. **Use BuildKit** (enabled by default in Docker Desktop)
2. **Mount pnpm store as volume** - already configured in docker-compose.yml
3. **Exclude node_modules from source mount** - prevents overwriting container deps
4. **Use `--prefer-offline`** - Docker layer cache + pnpm cache = fast installs
5. **Keep .dockerignore clean** - reduces build context size

## File Structure

```
.
├── Dockerfile                    # Main multi-stage Dockerfile
├── docker-compose.yml            # Development compose config
├── .dockerignore                 # Build context exclusions
├── docker/
│   ├── api.Dockerfile            # API-only production image
│   ├── web.Dockerfile            # Web-only production image
│   └── nginx-web.conf            # Nginx config for web
└── DOCKER_GUIDE.md               # This file
```

## Environment Variables

### Required
- `NODE_ENV` - Set automatically (development/production)
- `DATABASE_URL` - SQLite file path (set in docker-compose.yml)

### Optional
- `PORT` - API port (default: 3000)
- `WEB_ORIGIN` - CORS origin for API
- `CHOKIDAR_USEPOLLING` - Enable polling for file watching
- `CHOKIDAR_INTERVAL` - Polling interval in ms
- `NODE_OPTIONS` - Node.js flags (e.g., `--max-old-space-size=4096`)

## Notes on pnpm Workspace in Docker

### How pnpm Resolves Workspace Packages
1. **Lockfile** (`pnpm-lock.yaml`) defines exact versions
2. **Workspace manifest** (`pnpm-workspace.yaml`) declares package locations
3. **`pnpm install`** creates symlinks in `node_modules` for workspace packages
4. **Volume mounts** can override these symlinks if not handled correctly

### Critical: Isolated Volume Strategy
The key insight is that `.:/workspace:cached` mounts the **entire** host directory into the container, which would **override** the `node_modules` created by `pnpm install`. The solution:

```yaml
volumes:
  - .:/workspace:cached          # Source code (live reload)
  - api-node-modules:/workspace/node_modules  # Isolated deps
  - /workspace/node_modules      # Exclude from source mount
```

The last line (`- /workspace/node_modules`) tells Docker to **not** mount anything from the host for this path, allowing the named volume to persist.

### Why Not Just Copy node_modules?
- **Development**: Need live reload, so source must be mounted
- **Performance**: Named volumes are faster than bind mounts for `node_modules`
- **Compatibility**: Windows/Linux have different `node_modules` structures
- **Cache**: Named volumes persist across `docker compose down/up`

### Build Cache Optimization
The `--mount=type=cache` directive stores the pnpm store in a persistent cache:
```dockerfile
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline
```

This means:
- First build downloads packages to cache
- Subsequent builds reuse cached packages
- Only changed dependencies are downloaded
- Cache persists across container rebuilds
