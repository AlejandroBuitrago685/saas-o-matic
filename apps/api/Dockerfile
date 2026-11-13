# syntax=docker/dockerfile:1
# API image (08-despliegue §2, RNF-SEC-16, AC-60). Build context: the repository root (docker-compose.yml).
# Runtime: Node on Alpine, as the unprivileged `node` user; the code is owned by root and read-only, and only /data
# (the SQLite volume) is writable. Base image pinned by digest (02-monorepo §4.3).
ARG NODE_IMAGE=node:26.13.1-alpine3.24@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5

# Manifests of every workspace: npm ci checks the lockfile against all of them.
FROM ${NODE_IMAGE} AS manifests
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY packages/domain/package.json packages/domain/
COPY packages/contract/package.json packages/contract/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY e2e/package.json e2e/

# --ignore-scripts: no dependency runs code at install time. better-sqlite3 ships its musl binary inside the package
# (05-driver-sqlite), so nothing is compiled.
FROM manifests AS build
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/domain packages/domain
COPY packages/contract packages/contract
COPY apps/api apps/api
RUN npm run build:packages && npm run build -w @saas-o-matic/api

# Production dependencies of the API only: no Angular, no dev tools (Swagger UI and pino-pretty are dev-only).
FROM manifests AS deps
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund -w @saas-o-matic/api

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/packages/domain/package.json packages/domain/
COPY --from=build /app/packages/domain/dist packages/domain/dist
COPY --from=build /app/packages/contract/package.json packages/contract/
COPY --from=build /app/packages/contract/dist packages/contract/dist
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/drizzle apps/api/drizzle
# The named volume copies this folder, with its owner, the first time it is mounted.
RUN mkdir /data && chown node:node /data
USER node
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
