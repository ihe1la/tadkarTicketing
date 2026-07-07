# Docker Development & Production Setup

## Overview

This is a production-grade Docker setup for a pnpm monorepo supporting both development (with hot reload) and production builds.

**Architecture:**
- Node 20 Alpine (minimal, secure base image)
- pnpm 11.9.0 via corepack (reproducible, deterministic)
- Multi-stage build (dependencies → development/builder → production)
- Optimized layer caching for fast rebuilds
- Isolated volume mounts for live reload without conflicts

---

## Development Workflow

### Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Ports 3000 (API) and 4200 (Web) available

### Start Development

```bash
# Build images and start services with live reload
docker compose up --build

# Or rebuild in background
docker compose up -d --build
docker compose logs -f
```

Services start at:
- **API**: http://localhost:3000
- **Web**: http://localhost:4200
- **API Health**: http://localhost:3000/api/v1/health

### Development Commands

```bash
# View logs from both services
docker compose logs -f

# Logs for specific service
docker compose logs -f api
docker compose logs -f web

# Stop services (preserve data)
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v

# Rebuild after dependency changes
docker compose up --build

# Run ad-hoc command in container
docker compose exec api pnpm --filter @tadkar/api typecheck
docker compose exec web pnpm --filter @tadkar/web test
```

### Hot Reload Details

**File watching:**
- Changes to `src/` trigger rebuilds automatically
- NestJS uses `nest dev` with file watching enabled
- Angular CLI uses `ng serve` with `--poll 1000` (since polling is more reliable in containers)

**Why polling?** Docker on Windows/Mac and network volumes don't reliably propagate inotify events. Polling ensures consistent detection.

**Volume mounts:**
- `:cached` flag on main workspace mount (Docker → host sync, lower priority)
- Isolated named volumes for `node_modules` (prevents install conflicts)
- Separate volumes for build outputs (`.angular`, `dist`) to avoid sync bottlenecks)

### Troubleshooting Development

#### Port already in use
```bash
# Find process using port 3000
lsof -i :3000      # macOS/Linux
netstat -ano | grep :3000  # Windows

# Or use a different port
docker compose down
# Edit docker-compose.yml: ports: ["3001:3000"]
docker compose up
```

#### Volume permission issues (Linux)
```bash
# Ensure docker daemon has permission
sudo usermod -aG docker $USER
# Log out and back in
```

#### Changes not appearing
```bash
# Rebuild containers
docker compose down -v
docker compose up --build

# Check container is still running
docker compose ps
docker compose logs api
```

#### pnpm store cache stale
```bash
# Clear named volume cache
docker compose down -v
docker compose up --build
```

---

## Production Build & Deployment

### Build Production Image

```bash
# Build production image (targets 'production' stage)
docker build -t tadkar-app:latest --target production .

# Or with explicit version tag
docker build -t tadkar-app:v1.0.0 --target production .
```

**What it includes:**
- Optimized Node.js runtime (Alpine 3.20)
- Built API and Web artifacts only
- Production dependencies only (dev packages excluded)
- `dumb-init` as PID 1 for proper signal handling
- Health check support

### Run Production Container

```bash
# Single container (API only)
docker run -d \
  --name tadkar-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/data/production.db \
  -e WEB_ORIGIN=https://app.tadkar.ir \
  -v tadkar-data:/data \
  tadkar-app:latest

# Check health
docker exec tadkar-api wget -O- http://localhost:3000/api/v1/health

# View logs
docker logs -f tadkar-api

# Stop
docker stop tadkar-api
docker rm tadkar-api
```

### Production Compose (optional)

For a 2-container production setup with Nginx reverse proxy:

```bash
docker compose -f docker-compose.prod.yml up -d
```

(Create `docker-compose.prod.yml` if needed—reaches beyond scope of this setup.)

---

## Docker Image Optimization

### Layer Caching Strategy

The Dockerfile uses a specific layer order to maximize cache hits:

```
base (Alpine + corepack)
  ↓ [fast, reused unless Node version changes]
dependencies (fetch + install)
  ↓ [cached if package.json / pnpm-lock.yaml unchanged]
development / builder / production (source + build)
  ↓ [rebuilds on source changes]
```

**Why it's fast:**
1. Heavy `pnpm install` is cached separately
2. Source changes don't invalidate dependency layer
3. `pnpm fetch` uses BuildKit cache mount for shared store
4. Multiple targets (dev/prod) reuse the same base/deps layers

### Image Sizes

```
development:  ~1.2 GB (includes full node_modules, source, dev tools)
production:   ~350 MB (only built artifacts + runtime deps)
```

Production image is **3.4× smaller** because:
- No dev dependencies
- No source code
- No build tools
- Only necessary runtime files

---

## Workspace Structure Inside Container

```
/workspace (WORKDIR)
├── package.json                    (root workspace manifest)
├── pnpm-lock.yaml                  (lock file, immutable)
├── pnpm-workspace.yaml             (workspace config)
├── apps/
│   ├── api/                        (NestJS)
│   │   ├── src/
│   │   ├── dist/                   (built output, mounted to named volume)
│   │   ├── prisma/                 (database schemas)
│   │   └── package.json
│   └── web/                        (Angular)
│       ├── src/
│       ├── dist/                   (built output, mounted to named volume)
│       ├── .angular/               (build cache, mounted to named volume)
│       └── package.json
├── packages/
│   ├── config/                     (shared config)
│   ├── contracts/                  (TS types)
│   └── testing/                    (test utilities)
└── node_modules/                   (monorepo dependencies, mounted to named volume)
```

**Key:** All `node_modules` and build outputs are in **named volumes**, not the cached bind mount. This prevents:
- Slow sync of thousands of files
- Permission issues
- Conflicts between host and container package managers

---

## pnpm Workspace Inside Docker

### How pnpm Resolves Dependencies

When running `pnpm --filter @tadkar/api dev`:

1. pnpm reads `/workspace/pnpm-workspace.yaml` → discovers `apps/api`, `packages/config`, etc.
2. Reads all `package.json` files in the workspace
3. Uses `pnpm-lock.yaml` to install exact pinned versions
4. Symlinks internal packages (e.g., `@tadkar/config`) to `/workspace/packages/config`
5. Installs external npm deps to `/workspace/node_modules`
6. App can import: `import { Config } from '@tadkar/config'` → resolves to `packages/config`

**Inside Docker:** The same process works because:
- `pnpm-lock.yaml` is immutable (reproducible)
- Workspace paths are relative (`apps/*`, `packages/*`)
- No changes to business logic

### pnpm Store Cache

The `pnpm-store` named volume persists the pnpm content-addressable store:

- **Development:** Speeds up `pnpm install` when dependencies change
- **Production:** Not used (prod image uses `--prod` flag which downloads only runtime deps)

---

## Networking & Service Communication

### Development (docker-compose)

Services are on the same `tadkar-network` bridge:

- `web` can reach `api` at hostname `api:3000`
- `api` can reach `web` at hostname `web:4200`
- Both exposed to host at localhost

**API origin configuration:**
```env
WEB_ORIGIN=http://localhost:4200
```

If services communicate container-to-container, use:
```env
WEB_ORIGIN=http://web:4200
```

### Production (single container)

If running a single combined container or orchestrating separately:

```env
WEB_ORIGIN=https://app.tadkar.ir  # public HTTPS URL
DATABASE_URL=file:/data/prod.db   # persistent volume
PORT=3000
```

---

## Security & Hardening

### Base Image Security

- **Alpine 3.20:** Minimal, ~5 MB base OS (vs 100+ MB Debian)
- **Node 20:** LTS, security patches included
- **dumb-init:** Proper signal handling (avoids zombie processes)

### Runtime Security

- **No root user:** pnpm runs as node user (inherited from base image)
- **Read-only filesystem (optional):** Can add `--read-only` + `/tmp` tmpfs for prod
- **Health checks:** Services include `curl` alternatives that detect failures

### Best Practices

```bash
# Never run as root
docker run --user 1000:1000 tadkar-app:latest

# Use resource limits
docker run \
  --memory 1g \
  --cpus 1 \
  tadkar-app:latest

# Enable restart policy
docker run \
  --restart unless-stopped \
  tadkar-app:latest
```

---

## Building and Pushing to Registry

### Local Development Build

```bash
# Build all stages (outputs to local Docker daemon)
docker build -t tadkar-app:dev --target development .
docker build -t tadkar-app:prod --target production .

# Verify image
docker image ls | grep tadkar
```

### Registry Push (GCR / Docker Hub / etc.)

```bash
# Example: Google Container Registry
gcloud auth configure-docker
docker tag tadkar-app:latest gcr.io/my-project/tadkar:latest
docker push gcr.io/my-project/tadkar:latest

# Or Docker Hub
docker tag tadkar-app:latest myuser/tadkar:latest
docker login
docker push myuser/tadkar:latest
```

### CI/CD Integration

In GitHub Actions / GitLab CI / etc.:

```yaml
# Example: GitHub Actions
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    target: production
    tags: |
      myregistry.azurecr.io/tadkar:latest
      myregistry.azurecr.io/tadkar:${{ github.sha }}
    push: true
```

---

## Debugging Inside Container

### Interactive Shell

```bash
# Bash/sh shell in running container
docker compose exec api sh

# Or for a specific service
docker compose exec web sh

# Run command and exit
docker compose exec api pnpm --version
```

### Inspect Image Layers

```bash
# List all layers and their sizes
docker image history tadkar-app:latest

# See detailed build steps
docker image inspect tadkar-app:latest
```

### Logs and Debugging

```bash
# Stream logs with timestamps
docker compose logs -f --timestamps

# View last 100 lines
docker compose logs --tail 100

# View only error logs
docker compose logs | grep -i error
```

### Performance Profiling

```bash
# Check resource usage
docker stats

# CPU, memory, network I/O in real-time
docker compose exec api ps aux
docker compose exec api pnpm --filter @tadkar/api typecheck
# Time the above
docker compose exec api /usr/bin/time -v pnpm --filter @tadkar/api build
```

---

## Common Issues & Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Changes not reloading** | Files modified but app unchanged | Check `CHOKIDAR_USEPOLLING=true` in env; wait 1-2s for polling cycle |
| **pnpm ERR! EEXIST** | Package lock conflicts | `docker compose down -v && docker compose up --build` |
| **Permission denied** (Linux) | Can't write to volumes | Add user to docker group: `sudo usermod -aG docker $USER` |
| **OOM killer** | Container exits silently | Increase Docker memory limit in Desktop settings |
| **Port already in use** | `bind: address already in use` | Stop other services or change port in compose file |
| **Slow builds** | First build takes >5 min | Normal for Alpine + pnpm install; subsequent builds cached |
| **npm/yarn conflicts** | `pnpm ERR!` with corepack hints | Run `pnpm install` on host once to sync lock; containers use lock file |

---

## Performance Tips

### Development

1. **Use named volumes** (not bind mounts) for `node_modules` — much faster
2. **Enable caching** in Docker Desktop settings (Settings → Resources → Docker Engine)
3. **Avoid `docker compose down` during dev** — preserves volumes for faster restart
4. **Use `--poll 1000`** for Angular (balances responsiveness vs CPU)
5. **Increase Node heap** if builds are slow: `NODE_OPTIONS=--max-old-space-size=4096`

### Production

1. **Use multi-stage build** — keeps final image small and lean
2. **Copy only needed files** — Dockerfile explicitly excludes dev dependencies
3. **Use BuildKit cache mounts** for pnpm store — speeds up rebuild in CI/CD
4. **Layer order matters** — dependencies before source code
5. **Run health checks** — detect stale/crashed containers early

---

## Next Steps

1. **Build and test locally:**
   ```bash
   docker compose up --build
   # Visit http://localhost:4200
   # Check http://localhost:3000/api/v1/health
   ```

2. **For production deployment:**
   - Use `docker build --target production`
   - Push to container registry (GCR, ECR, Docker Hub, etc.)
   - Orchestrate with Kubernetes, Docker Swarm, or managed services (Cloud Run, App Engine, etc.)

3. **Optional: CI/CD pipeline** (GitHub Actions example)
   - Build on every commit to `main`
   - Push with git tag as Docker tag
   - Deploy to staging/production

---

## Files Reference

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for dev/prod |
| `docker-compose.yml` | Development environment with hot reload |
| `.dockerignore` | Optimized context for smaller builds |
| `pnpm-workspace.yaml` | Monorepo workspace definition |
| `pnpm-lock.yaml` | Locked dependencies (immutable, reproducible) |

---

**Last updated:** 2026-06-28
