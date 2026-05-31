# Node React Template

Express + React + Docker project scaffold with a TODO example.

## Tech Stack

- **Backend:** Node.js 22, TypeScript, Express 5
- **Frontend:** React 18, Ant Design 5, React Router 7, Vite 5
- **Tooling:** ESLint 10 (flat config), Prettier, TypeScript strict mode
- **Deploy:** Docker, Docker Compose (multi-stage build)

## Quick Start

```bash
# Install dependencies
npm install && cd web && npm install && cd ..

# Development (backend + frontend with HMR)
npm run dev:web
```

Open http://localhost:5173 — you should see the TODO app.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Backend only (auto-reload, reads WEB_PORT) |
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
│   ├── routes/
│   │   └── todo.ts        # Example TODO CRUD routes
│   └── utils.ts           # Shared utilities
├── web/
│   ├── src/
│   │   ├── main.tsx       # React entry
│   │   ├── App.tsx        # Routes + page organization
│   │   ├── api.ts         # REST client
│   │   ├── types.ts       # Shared types
│   │   ├── layouts/       # AppLayout (responsive shell)
│   │   ├── pages/         # TodoPage, LogViewerPage
│   │   ├── components/    # Sidebar, ErrorBoundary
│   │   └── hooks/         # useResponsive
│   ├── vite.config.ts
│   └── package.json
├── Dockerfile             # Multi-stage build
├── docker-compose.yml
└── package.json
```

## Customization

### Replace the TODO example

1. Add your routes in `src/routes/` and register them in `src/server.ts`
2. Create your pages in `web/src/pages/`
3. Update routes in `web/src/App.tsx`
4. Update sidebar menu in `web/src/App.tsx` (`menuItems`)

### Add a database

Replace the in-memory TODO storage in `src/routes/todo.ts` with your database of choice (SQLite, PostgreSQL, etc.).

## License

MIT
