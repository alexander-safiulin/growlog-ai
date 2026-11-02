# syntax=docker/dockerfile:1.7

FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Workspace package manifests only — invalidates install layer only when deps change.
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/nutrient-calc/package.json packages/nutrient-calc/
COPY packages/domain/package.json packages/domain/
COPY packages/api-client/package.json packages/api-client/
COPY apps/mobile/package.json apps/mobile/
RUN --mount=type=cache,id=growlog-ai-pnpm,target=/pnpm/store \
    pnpm fetch --frozen-lockfile

FROM base AS builder
WORKDIR /app

# Public env baked at build time (Coolify: mark as available at buildtime).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG BUILD_ID
ARG SOURCE_COMMIT
ARG COOLIFY_COMMIT_SHA

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV BUILD_ID=${BUILD_ID}
ENV SOURCE_COMMIT=${SOURCE_COMMIT}
ENV COOLIFY_COMMIT_SHA=${COOLIFY_COMMIT_SHA}

COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=deps /app/packages/nutrient-calc/package.json packages/nutrient-calc/
COPY --from=deps /app/packages/domain/package.json packages/domain/
COPY --from=deps /app/packages/api-client/package.json packages/api-client/
COPY --from=deps /app/apps/mobile/package.json apps/mobile/
RUN --mount=type=cache,id=growlog-ai-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

COPY . .

RUN --mount=type=cache,id=growlog-ai-next,target=/app/.next/cache \
    pnpm build

FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/supabase/seed/nutrient ./supabase/seed/nutrient

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3000/

CMD ["node", "server.js"]
