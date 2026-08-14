# Hush AI Radar — production image
# Multi-stage: build frontend + bundle server, then ship a slim runtime.
FROM node:22-alpine AS builder

WORKDIR /app

# Install all deps (build needs devDependencies: vite, esbuild, typescript)
COPY package*.json ./
RUN npm ci

# Copy source and build (vite build -> dist/, esbuild -> dist/server.cjs)
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Runtime only needs production deps (esbuild bundles the server as CJS,
# but runtime requires the externalized npm packages).
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts: static frontend + bundled server
COPY --from=builder /app/dist ./dist

# Persist SQLite snapshot data across container restarts
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000

# Health check against the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health | grep -q '"status":"ok"' || exit 1

CMD ["node", "dist/server.cjs"]
