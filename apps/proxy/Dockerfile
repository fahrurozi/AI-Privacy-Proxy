FROM node:22-alpine AS dashboard-builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/dashboard ./apps/dashboard
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @ai-privacy-proxy/shared build
RUN pnpm --filter dashboard build

FROM node:22-alpine AS proxy-builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/proxy ./apps/proxy
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @ai-privacy-proxy/shared build
RUN pnpm --filter proxy build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
COPY package.json pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/proxy/package.json ./apps/proxy/
RUN pnpm install --prod --ignore-scripts

COPY --from=proxy-builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=proxy-builder /app/apps/proxy/dist ./apps/proxy/dist
COPY --from=dashboard-builder /app/apps/dashboard/dist ./apps/dashboard/dist

WORKDIR /app/apps/proxy
RUN chown -R node:node /app
USER node

EXPOSE 8080

CMD ["node", "dist/main.js"]
