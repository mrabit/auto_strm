# stage 1: build backend
FROM node:22-alpine AS builder-backend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# stage 2: build frontend
FROM node:22-alpine AS builder-web
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# stage 3: run
FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder-backend /app/dist/ ./dist/
COPY --from=builder-web /app/web/dist/ ./web/dist/
EXPOSE 3000
CMD ["node", "dist/index.js"]
