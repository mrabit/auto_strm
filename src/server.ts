import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import type { Socket } from 'node:net';
import { load, validateConfig } from './config';
import type { ConfigFile, TaskConfig } from './config';
import type { SchedulerHandle } from './scheduler';
import { getLastSyncTimes } from './index';
import { getLogs, onLog } from './logger';
import { errorMessage } from './utils';

export function startServer(
  port: number,
  configPath: string,
  schedulerHandle: SchedulerHandle,
  runTask: (task: TaskConfig, overrideRemotePath?: string) => Promise<void>,
  initialTasks: TaskConfig[],
): Promise<{ server: Server; updateTasks: (tasks: TaskConfig[]) => void; close: () => void }> {
  let allTasks = initialTasks;
  const webhookTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // Clean up stale .tmp files
  const tmpPath = configPath + '.tmp';
  try {
    fs.unlinkSync(tmpPath);
    console.log(`cleaned up stale ${tmpPath}`);
  } catch {
    /* no tmp file, fine */
  }

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/config', async (_req, res) => {
    try {
      const raw = await fsp.readFile(configPath, 'utf-8');
      const cfg = JSON.parse(raw);
      if (cfg.tasks) {
        for (const t of cfg.tasks) {
          if (!t.key) t.key = crypto.randomUUID();
        }
      }
      const times = Object.fromEntries(getLastSyncTimes());
      res.json({ ...cfg, lastSyncTimes: times });
    } catch (err) {
      const msg = errorMessage(err);
      res.status(500).json({ error: msg });
    }
  });

  app.put('/api/config', async (req, res) => {
    try {
      const newCfg = req.body as ConfigFile & { lastSyncTimes?: Record<string, string> };
      validateConfig(newCfg);

      // Strip runtime-only lastSyncTimes before writing to disk
      const cfgToWrite = Object.fromEntries(
        Object.entries(newCfg).filter(([k]) => k !== 'lastSyncTimes'),
      ) as ConfigFile;

      const tmpPath = configPath + '.tmp';
      await fsp.writeFile(tmpPath, JSON.stringify(cfgToWrite, null, 2), 'utf-8');
      await fsp.rename(tmpPath, configPath);

      allTasks = load();
      schedulerHandle.update(allTasks.filter((t) => t.enabled));

      res.json({ success: true });
    } catch (err) {
      const msg = errorMessage(err);
      res.status(422).json({ error: msg });
    }
  });

  app.post('/api/tasks/:key/sync', (req, res) => {
    try {
      const { key } = req.params;
      const task = allTasks.find((t) => t.key === key);
      if (!task) {
        return res.status(404).json({ error: `Task "${key}" not found` });
      }
      runTask(task).catch((err) =>
        console.error(`[server] sync task "${key}" failed:`, errorMessage(err)),
      );
      res.json({ success: true });
    } catch (err) {
      const msg = errorMessage(err);
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/config/reload', (_req, res) => {
    try {
      allTasks = load();
      schedulerHandle.update(allTasks.filter((t) => t.enabled));
      res.json({ success: true });
    } catch (err) {
      const msg = errorMessage(err);
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.post('/api/webhook', (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }
    const taskName = (req.query.task as string) || undefined;

    if (taskName) {
      if (schedulerHandle.runNow(taskName)) {
        console.log(`[webhook] triggered sync for task "${taskName}"`);
        return res.json({ success: true, action: 'sync_triggered', task: taskName });
      }
      console.log(`[webhook] task "${taskName}" not found`);
      return res.status(404).json({ error: `Task "${taskName}" not found` });
    }

    // Auto-detect: try to match against tasks
    const { data, type } = req.body;

    // MoviePilot transfer.complete: match target dir path against task remote.path
    if (typeof type === 'string' && type === 'transfer.complete') {
      const targetPath: string | undefined =
        data?.transferinfo?.target_diritem?.path || data?.transferinfo?.target_item?.path;

      if (targetPath) {
        // Normalize slashes (e.g. //123云盘/Media//电影 → /123云盘/Media/电影)
        const normalizedPath = targetPath.replace(/\/+/g, '/');
        let bestMatch: { task: TaskConfig; len: number } | null = null;
        for (const task of allTasks) {
          if (!task.enabled) continue;
          if (
            normalizedPath.startsWith(task.remote.path) &&
            task.remote.path.length > (bestMatch?.len ?? -1)
          ) {
            bestMatch = { task, len: task.remote.path.length };
          }
        }
        if (bestMatch) {
          const timerKey = `${bestMatch.task.name}:${normalizedPath}`;
          const existing = webhookTimers.get(timerKey);
          if (existing) clearTimeout(existing);

          const timer = setTimeout(() => {
            webhookTimers.delete(timerKey);
            schedulerHandle.runNow(bestMatch!.task.name, normalizedPath);
          }, 60_000);
          webhookTimers.set(timerKey, timer);

          const action = existing ? 'replaced' : 'sync_triggered';
          console.log(
            `[webhook] MoviePilot path "${normalizedPath}" → task "${bestMatch.task.name}" (delayed 60s${existing ? ', replaced pending' : ''})`,
          );
          return res.json({
            success: true,
            action,
            task: bestMatch.task.name,
            path: normalizedPath,
          });
        }
      }
      console.log(`[webhook] MoviePilot no matching task for path: ${targetPath || '(none)'}`);
      return res.json({ success: true, action: 'no_match' });
    }

    // Unknown format
    console.log(`[webhook] unknown event type: ${JSON.stringify(req.body).slice(0, 300)}`);
    res.json({ success: true, action: 'logged' });
  });

  app.get('/api/logs', (_req, res) => {
    res.json(getLogs());
  });

  app.get('/api/logs/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Send history
    for (const entry of getLogs()) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
    }

    // Subscribe to new entries
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
      // Track active connections for graceful shutdown
      const connections = new Set<Socket>();
      server.on('connection', (conn) => {
        connections.add(conn);
        conn.on('close', () => connections.delete(conn));
      });

      console.log(`web server listening on http://localhost:${port}`);
      resolve({
        server,
        updateTasks: (tasks: TaskConfig[]) => {
          allTasks = tasks;
        },
        close: () => {
          // Cancel pending webhook timers
          for (const timer of webhookTimers.values()) clearTimeout(timer);
          webhookTimers.clear();
          // Stop accepting new connections
          server.close();
          // Destroy existing connections
          for (const conn of connections) conn.destroy();
        },
      });
    });
  });
}
