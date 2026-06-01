# Build stage for backend
FROM node:22-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Build stage for frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Production stage
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

# Copy backend
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=backend-builder /app/dist/ ./dist/

# Copy frontend
COPY --from=frontend-builder /app/web/dist/ ./web/dist/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1

CMD ["node", "dist/index.js"]
