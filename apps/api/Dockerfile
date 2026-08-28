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
RUN pnpm --filter @plusops/api prisma:generate
RUN pnpm --filter @plusops/contracts build
RUN pnpm --filter @plusops/api build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.base.json
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/node_modules apps/api/node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/src apps/api/src
COPY --from=build /app/packages/contracts/node_modules packages/contracts/node_modules
COPY --from=build /app/packages/contracts/dist packages/contracts/dist
COPY --from=build /app/packages/contracts/dist-cjs packages/contracts/dist-cjs
COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY packages/contracts/package.json packages/contracts/package.json
EXPOSE 4000
CMD ["sh", "-c", "node apps/api/prisma/run-prisma.cjs migrate deploy --schema prisma/schema.prisma && if [ \"${PLUSOPS_SEED_ON_START:-false}\" = \"true\" ]; then TS_NODE_PROJECT=apps/api/tsconfig.json node -r ./apps/api/node_modules/ts-node/register/transpile-only apps/api/prisma/seed.ts; fi && node apps/api/dist/main.js"]
