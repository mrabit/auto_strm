# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Express + React + Docker project scaffold with a TODO example. Backend runs on Node.js 22 with TypeScript strict mode, frontend uses React 18 with Ant Design 5.

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
- **Routes**: `src/routes/todo.ts` - Example CRUD (in-memory storage)
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

- `WEB_PORT` (required): Server port (default: 3000)
- `NODE_ENV`: `development` or `production`

### Development Notes

- Frontend runs on Vite (port 5173) with API proxy to backend (port 3000)
- Backend uses `tsx watch` for auto-reload during development
- ESLint flat config with Prettier integration in `eslint.config.mjs`
- TypeScript strict mode enabled in `tsconfig.json`
- Vitest for testing, test files in `src/__tests__/`

## Customization

- Add routes in `src/routes/` and register in `src/server.ts`
- Create pages in `web/src/pages/` and update routes in `web/src/App.tsx`
- Shared components in `web/src/components/`, hooks in `web/src/hooks/`
- Replace in-memory TODO storage with database in `src/routes/todo.ts`
