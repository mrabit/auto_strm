import fs from 'node:fs';
import path from 'node:path';

export interface RemoteConfig {
  url?: string;
  username?: string;
  password?: string;
  path?: string;
  publicUrl?: string;
  syncMetadata?: boolean;
}

/** RemoteConfig after merge — required fields are guaranteed by validation */
export interface ResolvedRemoteConfig {
  url: string;
  username: string;
  password: string;
  path: string;
  publicUrl?: string;
  syncMetadata?: boolean;
}

export interface RateLimitConfig {
  concurrency: number;
  intervalMs: number;
}

export interface LocalConfig {
  path: string;
}

export interface TaskConfig {
  name: string;
  remote: ResolvedRemoteConfig;
  local: LocalConfig;
  cron: string;
  rateLimit: RateLimitConfig;
  enabled: boolean;
}

interface RawTaskConfig {
  name: string;
  remote: RemoteConfig;
  local: LocalConfig;
  cron?: string;
  rateLimit?: Partial<RateLimitConfig>;
  enabled?: boolean;
}

interface ConfigFile {
  remote?: RemoteConfig;
  cron?: string;
  rateLimit?: Partial<RateLimitConfig>;
  tasks: RawTaskConfig[];
}

const configFile = process.env.NODE_ENV === 'development' ? 'dev.json' : 'default.json';
export const CONFIG_PATH = path.join(__dirname, '..', 'config', configFile);

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  concurrency: 5,
  intervalMs: 200,
};

export function load(): TaskConfig[] {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const cfg = JSON.parse(raw) as ConfigFile;

  if (!cfg.tasks || !Array.isArray(cfg.tasks) || cfg.tasks.length === 0) {
    throw new Error('config: "tasks" must be a non-empty array');
  }

  const common = cfg.remote || {};
  const commonRateLimit: Partial<RateLimitConfig> = cfg.rateLimit || {};
  const commonCron = cfg.cron;

  return cfg.tasks.map((task, i): TaskConfig => {
    const merged: RemoteConfig = { ...common, ...task.remote };

    const label = task.name || `task[${i}]`;
    if (!merged.url) throw new Error(`config: ${label}: remote.url is required`);
    if (!merged.username) throw new Error(`config: ${label}: remote.username is required`);
    if (!merged.password) throw new Error(`config: ${label}: remote.password is required`);
    if (!merged.path) throw new Error(`config: ${label}: remote.path is required`);
    if (!task.local?.path) throw new Error(`config: ${label}: local.path is required`);

    const cron = task.cron || commonCron;
    if (!cron) throw new Error(`config: ${label}: cron is required`);

    merged.url = merged.url.replace(/\/+$/, '');
    merged.path = '/' + merged.path.replace(/^\/+|\/+$/g, '');
    merged.syncMetadata ??= true;

    const rateLimit: RateLimitConfig = {
      ...DEFAULT_RATE_LIMIT,
      ...commonRateLimit,
      ...(task.rateLimit || {}),
    };

    return {
      name: task.name,
      remote: merged as ResolvedRemoteConfig,
      local: { path: path.resolve(task.local.path) },
      cron,
      rateLimit,
      enabled: task.enabled ?? true,
    };
  });
}
