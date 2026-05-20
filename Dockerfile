# stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/tsconfig.json ./
COPY app/src/ ./src/
RUN npm run build

# stage 2: run
FROM node:22-alpine
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci --production
COPY app/config/ ./config/
COPY --from=builder /app/dist/ ./dist/
CMD ["node", "dist/index.js"]
