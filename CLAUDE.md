# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Express + React + Docker project scaffold with a SeriesUpdate example backed by Strapi CMS. Backend runs on Node.js 22 with TypeScript strict mode, frontend uses React 19 with Ant Design 6.

## Common Commands

```bash
# Development (backend + frontend with HMR)
npm run dev:web

# Backend only (auto-reload)
npm run dev

# Build
npm run build          # Backend TypeScript
npm run build:web      # Frontend Vite
npm run build:all      # Both

# Check & Lint
npm run check          # Lint + type-check
npm run lint           # ESLint only
npm run format         # Prettier

# Test
npm run test           # Vitest (single run)
npm run test:watch     # Vitest (watch mode)

# Docker
docker compose up --build
```

## Architecture

### Backend (`src/`)

- **Entry**: `src/index.ts` - Starts server, handles graceful shutdown
- **Server**: `src/server.ts` - Express 5 API with health check, SSE log stream, SPA fallback
- **Logger**: `src/logger.ts` - Ring buffer (1000 entries) + console capture + SSE streaming
- **DB**: `src/db.ts` - `require-from-remote` 远程加载 Strapi SDK + SeriesUpdate CRUD helpers
- **Routes**: `src/routes/seriesupdate.ts` - CRUD (Strapi-backed persistence)
- **Utils**: `src/utils.ts` - pad / errorMessage 工具函数
- **Tests**: `src/__tests__/server.test.ts` - Server API tests (Vitest)

### Frontend (`web/src/`)

- **Entry**: `web/src/main.tsx` - React root with BrowserRouter, Ant Design ConfigProvider
- **Routes**: `web/src/App.tsx` - Lazy-loaded pages with menu items
- **API Client**: `web/src/api.ts` - REST client + SSE log subscription
- **Types**: `web/src/types.ts` - 共享类型定义
- **Layouts**: `web/src/layouts/AppLayout.tsx` - Responsive shell with sidebar
- **Components**:
  - `web/src/components/ErrorBoundary.tsx` - 全局错误边界
  - `web/src/components/Sidebar.tsx` - 侧边栏
- **Hooks**: `web/src/hooks/useResponsive.ts` - 响应式断点 hook
- **Utils**: `web/src/utils/ansiToHtml.ts` - ANSI 转 HTML

### Key Patterns

1. **API Routes**: All prefixed with `/api/`, registered in `src/server.ts`
2. **SPA Fallback**: Express serves `web/dist/index.html` for non-API routes
3. **SSE Logging**: Real-time log streaming via `/api/logs/stream`

### Environment Variables

- `NODE_ENV`: `development` or `production`
- `STRAPI_URL`: Strapi instance URL (default: `http://localhost:1337`)
- `STRAPI_TOKEN`: Strapi API token for authentication

### Strapi Setup

1. 在 Strapi 后台创建 `seriesupdates` collection，字段：`name` (Text, required), `SERIES_ID` (Text), `SEASON_ID` (Text), `URL` (Text)
2. 在 Settings > API Tokens 创建 token（Read/Update/Create/Delete 权限）
3. 配置 `.env` 中的 `STRAPI_URL` 和 `STRAPI_TOKEN`

### Development Notes

- Frontend runs on Vite (port 5173) with API proxy to backend (port 3000)
- Backend uses `tsx watch` for auto-reload during development
- ESLint flat config with Prettier integration in `eslint.config.mjs`（根目录统一管理，web/ 不再有独立 eslint 配置）
- TypeScript strict mode enabled in `tsconfig.json`
- Vitest for testing, test files in `src/__tests__/`

## Customization

- Add routes in `src/routes/` and register in `src/server.ts`
- Create pages in `web/src/pages/` and update routes in `web/src/App.tsx`
- Shared components in `web/src/components/`, hooks in `web/src/hooks/`
- Strapi CRUD helpers in `src/db.ts`，参考 `getSeriesUpdates` / `createSeriesUpdate` 模式扩展新 collection
