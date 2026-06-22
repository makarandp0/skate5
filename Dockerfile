ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base
RUN corepack enable && corepack prepare pnpm@10.34.3 --activate
WORKDIR /app

# --- deps: install only production + build dependencies ---
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile

# --- build: compile all packages ---
FROM deps AS build
COPY packages/shared/ packages/shared/
COPY packages/api/ packages/api/
COPY packages/web/ packages/web/
COPY tsconfig.base.json tsconfig.json ./
RUN pnpm --filter @skate5/shared run build && \
    pnpm --filter @skate5/api run build && \
    pnpm --filter @skate5/web run build

# --- runner: minimal production image ---
FROM node:${NODE_VERSION}-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.34.3 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/api/dist packages/api/dist
COPY --from=build /app/packages/web/dist packages/web/dist

ENV NODE_ENV=production
ENV STATIC_PATH=/app/packages/web/dist
ENV PORT=3000
EXPOSE 3000

COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
