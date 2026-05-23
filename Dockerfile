# stage 1: build backend
FROM node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920 AS builder-backend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# stage 2: build frontend
FROM node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920 AS builder-web
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# stage 3: run
FROM node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY config/ ./config/
COPY --from=builder-backend /app/dist/ ./dist/
COPY --from=builder-web /app/web/dist/ ./web/dist/
CMD ["node", "dist/index.js"]
