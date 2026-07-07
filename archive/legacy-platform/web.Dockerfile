FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @tadkar/web build
FROM nginx:1.29-alpine
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/web/dist/web/browser /usr/share/nginx/html
USER nginx
