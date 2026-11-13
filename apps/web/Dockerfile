# syntax=docker/dockerfile:1
# Web image (08-despliegue §2, ADR-012, AC-60): the production build of the SPA served by nginx, which also forwards
# /api to the API. Build context: the repository root (docker-compose.yml). Base images pinned by digest
# (02-monorepo §4.3); nginx-unprivileged runs as uid 101 on port 8080.
ARG NODE_IMAGE=node:26.13.1-alpine3.24@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.30.6-alpine3.24@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03

FROM ${NODE_IMAGE} AS build
ENV NG_CLI_ANALYTICS=false
WORKDIR /app
# Manifests of every workspace: npm ci checks the lockfile against all of them.
COPY package.json package-lock.json .npmrc ./
COPY packages/domain/package.json packages/domain/
COPY packages/contract/package.json packages/contract/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY e2e/package.json e2e/
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/domain packages/domain
COPY packages/contract packages/contract
COPY apps/web apps/web
RUN npm run build:packages && npm run build -w @saas-o-matic/web

FROM ${NGINX_IMAGE} AS runtime
COPY apps/web/nginx/nginx.conf /etc/nginx/nginx.conf
COPY apps/web/nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY apps/web/nginx/api-error-headers.conf /etc/nginx/api-error-headers.conf
COPY --from=build /app/apps/web/dist/web/browser /srv/saas-o-matic
EXPOSE 8080
# nginx directly, without the entrypoint scripts of the base image: they try to rewrite /etc/nginx, which is read-only.
ENTRYPOINT ["nginx", "-g", "daemon off;"]
