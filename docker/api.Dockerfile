# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:20-bookworm-slim
ARG PNPM_VERSION=11.9.0

FROM ${NODE_IMAGE} AS base
ENV CI=true \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /workspace

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/api/prisma/prototype.prisma apps/api/prisma/prototype.prisma
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --offline --frozen-lockfile --filter @tadkar/api...
WORKDIR /workspace/apps/api
RUN pnpm prisma:ensure

FROM deps AS dev
WORKDIR /workspace
ENV NODE_ENV=development \
    DATABASE_URL=file:./apps/api/prisma/dev.db \
    WEB_ORIGIN=http://localhost:4200 \
    PORT=3000
CMD ["pnpm", "--filter", "@tadkar/api", "dev"]

FROM deps AS build
WORKDIR /workspace
COPY apps/api apps/api
RUN pnpm --filter @tadkar/api prisma:ensure
RUN pnpm --filter @tadkar/api exec prisma db push --skip-generate --schema prisma/prototype.prisma
RUN pnpm --filter @tadkar/api seed
RUN pnpm --filter @tadkar/api build
RUN pnpm --filter @tadkar/api deploy /out/api --prod
RUN cp -R /workspace/apps/api/dist /out/api/dist
RUN mkdir -p /out/api/prisma && cp /workspace/apps/api/prisma/dev.db /out/api/prisma/dev.db

FROM ${NODE_IMAGE} AS prod
ENV NODE_ENV=production \
    DATABASE_URL=file:./prisma/dev.db \
    WEB_ORIGIN=http://localhost \
    PORT=3000
WORKDIR /app
COPY --from=build /out/api ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
