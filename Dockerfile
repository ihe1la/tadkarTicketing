# Production-grade pnpm monorepo Docker setup for Tadkar
# Optimized for caching, security, and developer experience

ARG NODE_IMAGE=node:22-alpine
ARG PNPM_VERSION=11.9.0

# ============================================================================
# BASE: Node + corepack + pnpm
# ============================================================================
FROM ${NODE_IMAGE} AS base
RUN apk add --no-cache dumb-init
ENV CI=true \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NODE_OPTIONS=--max-old-space-size=4096
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /workspace

# ============================================================================
# DEPENDENCIES: Fetch and install (cache layer)
# ============================================================================
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/testing/package.json packages/testing/package.json

# Fetch dependencies once (cached, reproducible from lock file)
RUN --mount=type=cache,id=s/67ab5eb6-08a1-43ff-b527-329f925a4ad1-/pnpm/store,target=/pnpm/store \
    pnpm fetch --frozen-lockfile

# Install dependencies (will use fetched cache)
# --prefer-offline uses local cache, --frozen-lockfile ensures reproducibility
RUN --mount=type=cache,id=s/67ab5eb6-08a1-43ff-b527-329f925a4ad1-/pnpm/store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# ============================================================================
# DEVELOPMENT: Live reload with volume mounts
# ============================================================================
FROM dependencies AS development
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.base.json ./

ENV NODE_ENV=development
EXPOSE 3000 4200

# Use dumb-init to properly handle signals
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["pnpm", "dev"]

# ============================================================================
# BUILDER: Production build stage
# ============================================================================
FROM dependencies AS builder
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.base.json ./

ENV NODE_ENV=production

# Generate the Prisma Client from the prototype schema before TypeScript compilation.
RUN pnpm --filter @tadkar/api prisma:ensure

# Build API and web
RUN pnpm --filter @tadkar/api build && \
    pnpm --filter @tadkar/web build

# ============================================================================
# PRODUCTION: Reuse the verified build output and generated Prisma Client
# ============================================================================
FROM builder AS production
ENV NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["pnpm", "--filter", "@tadkar/api", "start"]
