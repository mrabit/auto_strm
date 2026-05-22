import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import { load, validateConfig } from './config';
import type { ConfigFile, TaskConfig } from './config';
import type { SchedulerHandle } from './scheduler';
import { getLogs } from './logger';

export function startServer(
  port: number,
  configPath: string,
  schedulerHandle: SchedulerHandle,
  runTask: (task: TaskConfig, overrideRemotePath?: string) => Promise<void>,
  initialTasks: TaskConfig[],
): Promise<{ server: Server; updateTasks: (tasks: TaskConfig[]) => void }> {
  let allTasks = initialTasks;

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
      res.json(cfg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  app.put('/api/config', async (req, res) => {
    try {
      const newCfg = req.body as ConfigFile;
      validateConfig(newCfg);

      const tmpPath = configPath + '.tmp';
      await fsp.writeFile(tmpPath, JSON.stringify(newCfg, null, 2), 'utf-8');
      await fsp.rename(tmpPath, configPath);

      allTasks = load();
      schedulerHandle.update(allTasks.filter((t) => t.enabled));

      res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
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
      runTask(task);
      res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/config/reload', (_req, res) => {
    try {
      allTasks = load();
      schedulerHandle.update(allTasks.filter((t) => t.enabled));
      res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
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
        let bestMatch: { task: TaskConfig; len: number } | null = null;
        for (const task of allTasks) {
          if (!task.enabled) continue;
          if (
            targetPath.startsWith(task.remote.path) &&
            task.remote.path.length > (bestMatch?.len ?? -1)
          ) {
            bestMatch = { task, len: task.remote.path.length };
          }
        }
        if (bestMatch) {
          setTimeout(() => {
            schedulerHandle.runNow(bestMatch!.task.name, targetPath);
          }, 60_000);
          console.log(
            `[webhook] MoviePilot path "${targetPath}" → task "${bestMatch.task.name}" (delayed 60s)`,
          );
          return res.json({
            success: true,
            action: 'sync_triggered',
            task: bestMatch.task.name,
            path: targetPath,
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

  // Static files + SPA fallback
  const webDir = path.join(__dirname, '..', 'web', 'dist');
  app.use(express.static(webDir));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(webDir, 'index.html'));
  });

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`web server listening on http://localhost:${port}`);
      resolve({
        server,
        updateTasks: (tasks: TaskConfig[]) => {
          allTasks = tasks;
        },
      });
    });
  });
}
