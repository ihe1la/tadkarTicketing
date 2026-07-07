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
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch --frozen-lockfile
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --offline --frozen-lockfile --filter @tadkar/web...

FROM deps AS dev
WORKDIR /workspace
ENV NODE_ENV=development
CMD ["pnpm", "--filter", "@tadkar/web", "dev", "--", "--host", "0.0.0.0", "--port", "4200", "--poll", "1000"]

FROM deps AS build
WORKDIR /workspace
COPY apps/web apps/web
RUN pnpm --filter @tadkar/web build

FROM nginx:1.27-alpine AS prod
COPY docker/nginx-web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist/web/browser/ /usr/share/nginx/html/
EXPOSE 80
