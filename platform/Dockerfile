# Orange platform image — one image, two roles: web (next start) and worker.
# NOTE: not built in the authoring environment (no Docker daemon); see BUILD_STATUS.md.
FROM node:22.23.5-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build needs a reachable DATABASE_URL only if pages are prerendered; all data pages are dynamic.
RUN pnpm build

FROM node:22.23.5-bookworm-slim AS run
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate \
 && apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 1001 app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=app /app /app
USER app
EXPOSE 3000
CMD ["pnpm", "start"]
