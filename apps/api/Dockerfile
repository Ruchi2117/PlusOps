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
COPY . .
RUN pnpm install --offline --frozen-lockfile
RUN pnpm --filter @plusops/contracts build
RUN pnpm --filter @plusops/api build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/node_modules apps/api/node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/api/package.json apps/api/package.json
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
