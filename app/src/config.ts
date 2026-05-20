import fs from 'node:fs';
import path from 'node:path';

export interface RemoteConfig {
  url: string;
  username: string;
  password: string;
  path: string;
  publicUrl?: string;
  syncMetadata?: boolean;
}

export interface LocalConfig {
  path: string;
}

export interface TaskConfig {
  name: string;
  remote: RemoteConfig;
  local: LocalConfig;
  cron: string;
}

const configFile = process.env.NODE_ENV === 'development' ? 'dev.json' : 'default.json';
const CONFIG_PATH = path.join(__dirname, '..', 'config', configFile);

export function load(): TaskConfig[] {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const cfg = JSON.parse(raw) as { tasks: TaskConfig[] };

  if (!cfg.tasks || !Array.isArray(cfg.tasks) || cfg.tasks.length === 0) {
    throw new Error('config: "tasks" must be a non-empty array');
  }

  cfg.tasks.forEach((task, i) => {
    const label = task.name || `task[${i}]`;
    if (!task.remote?.url) throw new Error(`config: ${label}: remote.url is required`);
    if (!task.remote?.path) throw new Error(`config: ${label}: remote.path is required`);
    if (!task.local?.path) throw new Error(`config: ${label}: local.path is required`);
    if (!task.cron) throw new Error(`config: ${label}: cron is required`);

    task.remote.url = task.remote.url.replace(/\/+$/, '');
    task.remote.path = '/' + task.remote.path.replace(/^\/+|\/+$/g, '');
    task.remote.syncMetadata ??= true;
    task.local.path = path.resolve(task.local.path);
  });

  return cfg.tasks;
}
