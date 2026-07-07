FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @tadkar/api build
FROM node:24-alpine
WORKDIR /app
COPY --from=build /app /app
USER node
CMD ["node","apps/api/dist/main.js"]
