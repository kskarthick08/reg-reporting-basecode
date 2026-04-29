# =====================================================
# NTT_Data_MCP_System - Optimized Frontend Dockerfile
# Multi-stage build with proper caching
# =====================================================

# -----------------------------
# Builder Stage
# -----------------------------
FROM node:20-slim AS builder

WORKDIR /app

# Build arguments for environment variables
ARG VITE_API_URL=http://localhost:8000
ARG VITE_API_BASE_PATH=/api

# Set as environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_BASE_PATH=$VITE_API_BASE_PATH

# ⚠ Do NOT set NODE_ENV=production before npm install
# Otherwise devDependencies (like vite) will not install
ENV NPM_CONFIG_AUDIT=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# -----------------------------------------------------
# Copy only package files first (CACHED LAYER)
# npm install runs ONLY if package.json changes
# -----------------------------------------------------
COPY package.json package-lock.json ./

# ✅ Keep your SSL workaround
RUN npm config set strict-ssl false \
 && npm config set registry http://registry.npmjs.org/

# ✅ Install including devDependencies (vite required for build)
RUN npm install --strict-ssl=false --include=dev

# -----------------------------------------------------
# Copy source code (rebuild only if code changes)
# -----------------------------------------------------
COPY . .

# Build production assets
RUN npm run build


# -----------------------------
# Production Stage
# -----------------------------
FROM nginx:1.25-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (SPA support)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove default html
RUN rm -rf /usr/share/nginx/html/*

# Copy built app from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
