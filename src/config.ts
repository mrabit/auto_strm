import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CronJob } from 'cron';

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

export interface JellyfinConfig {
  url: string;
  token: string;
  enabled?: boolean;
}

export interface LocalConfig {
  path: string;
}

export interface TaskConfig {
  name: string;
  key?: string;
  remote: ResolvedRemoteConfig;
  local: LocalConfig;
  cron: string;
  rateLimit: RateLimitConfig;
  enabled: boolean;
  jellyfin?: JellyfinConfig;
}

export interface RawTaskConfig {
  name: string;
  remote: RemoteConfig;
  local: LocalConfig;
  cron?: string;
  rateLimit?: Partial<RateLimitConfig>;
  enabled?: boolean;
  jellyfin?: JellyfinConfig;
  key?: string;
}

export interface ConfigFile {
  remote?: RemoteConfig;
  cron?: string;
  rateLimit?: Partial<RateLimitConfig>;
  jellyfin?: JellyfinConfig;
  tasks: RawTaskConfig[];
}

const configFile = process.env.NODE_ENV === 'development' ? 'dev.json' : 'default.json';
export const CONFIG_PATH = path.join(__dirname, '..', 'config', configFile);

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  concurrency: 5,
  intervalMs: 200,
};

export function validateConfig(cfg: ConfigFile): void {
  if (!cfg.tasks || !Array.isArray(cfg.tasks)) {
    throw new Error('config: "tasks" must be an array');
  }

  const common = cfg.remote || {};
  const commonCron = cfg.cron;

  cfg.tasks.forEach((task, i) => {
    const merged: RemoteConfig = { ...common, ...task.remote };
    const label = task.name || `task[${i}]`;

    if (!merged.url) throw new Error(`config: ${label}: remote.url is required`);
    if (!merged.username) throw new Error(`config: ${label}: remote.username is required`);
    if (!merged.password) throw new Error(`config: ${label}: remote.password is required`);
    if (!merged.path) throw new Error(`config: ${label}: remote.path is required`);
    if (!task.local?.path) throw new Error(`config: ${label}: local.path is required`);

    const cron = task.cron || commonCron;
    if (!cron) throw new Error(`config: ${label}: cron is required`);
    try {
      new CronJob(cron, () => {});
    } catch {
      throw new Error(`config: ${label}: invalid cron expression "${cron}"`);
    }

    const jellyfin = task.jellyfin || cfg.jellyfin;
    if (jellyfin && jellyfin.enabled !== false) {
      if (!jellyfin.url)
        throw new Error(`config: ${label}: jellyfin.url is required when jellyfin is enabled`);
      if (!jellyfin.token)
        throw new Error(`config: ${label}: jellyfin.token is required when jellyfin is enabled`);
    }
  });
}

export function load(): TaskConfig[] {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const cfg = JSON.parse(raw) as ConfigFile;

  validateConfig(cfg);

  const common = cfg.remote || {};
  const commonRateLimit: Partial<RateLimitConfig> = cfg.rateLimit || {};
  const commonCron = cfg.cron;

  let migrated = false;

  const tasks = cfg.tasks.map((task): TaskConfig => {
    if (!task.key) {
      task.key = crypto.randomUUID();
      migrated = true;
    }

    const merged: RemoteConfig = { ...common, ...task.remote };
    const cron = task.cron || commonCron;

    merged.url = merged.url!.replace(/\/+$/, '');
    merged.path = '/' + merged.path!.replace(/^\/+|\/+$/g, '');
    merged.syncMetadata ??= true;

    const jellyfin = task.jellyfin || cfg.jellyfin;

    const rateLimit: RateLimitConfig = {
      ...DEFAULT_RATE_LIMIT,
      ...commonRateLimit,
      ...(task.rateLimit || {}),
    };

    return {
      name: task.name,
      key: task.key!,
      remote: merged as ResolvedRemoteConfig,
      local: { path: path.resolve(task.local.path) },
      cron: cron!,
      rateLimit,
      enabled: task.enabled ?? true,
      jellyfin,
    };
  });

  if (migrated) {
    const tmpPath = CONFIG_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(cfg, null, 2), 'utf-8');
    fs.renameSync(tmpPath, CONFIG_PATH);
  }

  return tasks;
}
