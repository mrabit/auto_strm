# stage 1: build backend
FROM node:22-alpine AS builder-backend
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/tsconfig.json ./
COPY app/src/ ./src/
RUN npm run build

# stage 2: build frontend
FROM node:22-alpine AS builder-web
WORKDIR /app/web
COPY app/web/package.json app/web/package-lock.json ./
RUN npm ci
COPY app/web/ ./
RUN npm run build

# stage 3: run
FROM node:22-alpine
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci --production
COPY app/config/ ./config/
COPY --from=builder-backend /app/dist/ ./dist/
COPY --from=builder-web /app/web/dist/ ./web/dist/
CMD ["node", "dist/index.js"]
