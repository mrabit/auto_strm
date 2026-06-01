# Node React Template

Express + React + Docker project scaffold with a SeriesUpdate example backed by Strapi CMS.

## Tech Stack

- **Backend:** Node.js 22, TypeScript 5.8, Express 5
- **Frontend:** React 19, Ant Design 6, React Router 7, Vite 6
- **Tooling:** ESLint 10 (flat config), Prettier, TypeScript strict mode
- **Deploy:** Docker, Docker Compose (multi-stage build)

## Quick Start

```bash
# Install dependencies
npm install && cd web && npm install && cd ..

# Development (backend + frontend with HMR)
npm run dev:web
```

Open http://localhost:5173 — you should see the app.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Backend only (auto-reload) |
| `npm run dev:web` | Backend + frontend (HMR, proxy on :5173) |
| `npm run build` | Compile backend TypeScript |
| `npm run build:web` | Build frontend (Vite) |
| `npm run build:all` | Build both |
| `npm run check` | Lint + type-check |
| `docker compose up --build` | Run in Docker |

## Project Structure

```
├── src/
│   ├── index.ts           # Entry: starts server + graceful shutdown
│   ├── server.ts          # Express API (health, SSE, SPA fallback)
│   ├── logger.ts          # Ring buffer + console capture + SSE
│   ├── db.ts              # Strapi SDK loader + CRUD helpers
│   ├── routes/
│   │   └── seriesupdate.ts  # SeriesUpdate CRUD routes
│   └── utils.ts           # Shared utilities
├── web/
│   ├── src/
│   │   ├── main.tsx       # React entry
│   │   ├── App.tsx        # Routes + page organization
│   │   ├── api.ts         # REST client
│   │   ├── types.ts       # Shared types
│   │   ├── layouts/       # AppLayout (responsive shell)
│   │   ├── pages/         # SeriesUpdatePage, LogViewerPage
│   │   ├── components/    # Sidebar, ErrorBoundary
│   │   └── hooks/         # useResponsive
│   ├── vite.config.ts
│   └── package.json
├── Dockerfile             # Multi-stage build
├── docker-compose.yml
└── package.json
```

## Customization

### Add routes

1. Add your routes in `src/routes/` and register them in `src/server.ts`
2. Create your pages in `web/src/pages/`
3. Update routes in `web/src/App.tsx`
4. Update sidebar menu in `web/src/App.tsx` (`menuItems`)

### Add a new Strapi collection

参考 `src/db.ts` 中 `getSeriesUpdates` / `createSeriesUpdate` 模式，为新 collection 添加 CRUD helpers，然后在 `src/routes/` 中创建对应路由。

## License

MIT
