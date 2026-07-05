# syntax=docker/dockerfile:1
#
# Production image for the Go Game API (apps/go-game-api).
#
# Build context MUST be the repository root:
#   docker build -f docker/api/Dockerfile -t go-game-api .
#
# The Nx esbuild target is configured with `bundle: false`, so the runtime
# needs node_modules present. We build prod deps and the app in separate
# stages, then assemble a slim runtime image. All stages share a Debian/glibc
# base so the native bcrypt binary built in `deps` runs in the final image.

# ---- deps: production-only node_modules (with compiled native modules) ----
FROM node:20 AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# ---- builder: full install + Nx production build ----
FROM node:20 AS builder
WORKDIR /repo
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx nx build go-game-api --configuration=production

# ---- runner: minimal runtime ----
FROM node:20-slim AS runner
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080
WORKDIR /app

# Run as the built-in non-root user shipped with the node image.
COPY --chown=node:node --from=deps /repo/node_modules ./node_modules
COPY --chown=node:node --from=builder /repo/dist/apps/go-game-api ./

USER node
EXPOSE 8080

# Container-native health check (no curl/wget in slim image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "main.js"]
