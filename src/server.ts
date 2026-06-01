import path from 'node:path';
import express from 'express';
import type { Server } from 'node:http';
import type { Socket } from 'node:net';
import { getLogs, onLog } from './logger';
import todoRouter from './routes/todo';

export function startServer(port: number): Promise<{ server: Server; close: () => void }> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Business routes
  app.use(todoRouter);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Logs API
  app.get('/api/logs', (_req, res) => {
    res.json(getLogs());
  });

  // SSE log stream
  app.get('/api/logs/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    for (const entry of getLogs()) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
    }

    const unsubscribe = onLog((entry) => {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
    });

    req.on('close', () => unsubscribe());
  });

  // Static files + SPA fallback
  const webDir = path.join(__dirname, '..', 'web', 'dist');
  app.use(express.static(webDir));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(webDir, 'index.html'));
  });

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      const connections = new Set<Socket>();
      server.on('connection', (conn) => {
        connections.add(conn);
        conn.on('close', () => connections.delete(conn));
      });

      console.log(`服务器监听 http://localhost:${port}`);
      resolve({
        server,
        close: () => {
          server.close();
          for (const conn of connections) conn.destroy();
        },
      });
    });
  });
}
