FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm fetch

FROM deps AS build
ARG VITE_API_URL
ARG VITE_PLUSOPS_DATA_MODE=live
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_PLUSOPS_DATA_MODE=$VITE_PLUSOPS_DATA_MODE
COPY . .
RUN pnpm install --offline --frozen-lockfile
RUN pnpm --filter @plusops/contracts build
RUN pnpm --filter @plusops/web build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
