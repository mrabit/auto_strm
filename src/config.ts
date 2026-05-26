import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CronJob } from 'cron';

export const DEFAULT_META_EXTS =
  '.nfo,.jpg,.jpeg,.png,.svg,.ass,.ssa,.srt,.sup,.mp3,.flac,.wav,.aac';
export const DEFAULT_VIDEO_EXTS = '.mkv,.iso,.ts,.mp4,.avi,.rmvb,.wmv,.m2ts,.mpg,.flv,.rm,.mov';

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
  metaExts: Set<string>;
  videoExts: Set<string>;
}

export interface RawTaskConfig {
  name: string;
  remote: RemoteConfig;
  local: LocalConfig;
  cron?: string;
  rateLimit?: Partial<RateLimitConfig>;
  enabled?: boolean;
  jellyfin?: JellyfinConfig;
  metaExts?: string;
  videoExts?: string;
  key?: string;
}

export interface ConfigFile {
  remote?: RemoteConfig;
  cron?: string;
  rateLimit?: Partial<RateLimitConfig>;
  jellyfin?: JellyfinConfig;
  metaExts?: string;
  videoExts?: string;
  tasks: RawTaskConfig[];
}

const configFile = process.env.NODE_ENV === 'development' ? 'dev.json' : 'default.json';
export const CONFIG_PATH = path.join(__dirname, '..', 'config', configFile);

function csvToSet(csv: string): Set<string> {
  return new Set(
    csv
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0)
      .map((s) => (s.startsWith('.') ? s : '.' + s)),
  );
}

export function parseExtStr(input: string | undefined, defaultStr: string): Set<string> {
  const result = csvToSet(input ?? '');
  return result.size > 0 ? result : csvToSet(defaultStr);
}

function mergeExtSets(global: Set<string>, taskCsv: string | undefined): Set<string> {
  if (!taskCsv) return global;
  return new Set([...global, ...parseExtStr(taskCsv, '')]);
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  concurrency: 5,
  intervalMs: 200,
};

export function validateConfig(cfg: ConfigFile): void {
  if (!cfg.tasks || !Array.isArray(cfg.tasks)) {
    throw new Error('config: "tasks" must be an array');
  }

  // Validate global ext formats if provided
  for (const [field, value] of [
    ['metaExts', cfg.metaExts],
    ['videoExts', cfg.videoExts],
  ] as const) {
    if (value !== undefined && typeof value === 'string') {
      const parsed = csvToSet(value);
      if (parsed.size === 0) {
        throw new Error(`config: ${field} is empty after parsing`);
      }
    }
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

    // Validate task-level ext formats if provided
    for (const [field, value] of [
      ['metaExts', task.metaExts],
      ['videoExts', task.videoExts],
    ] as const) {
      if (value !== undefined && typeof value === 'string') {
        const parsed = csvToSet(value);
        if (parsed.size === 0) {
          throw new Error(`config: ${label}: ${field} is empty after parsing`);
        }
      }
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
  console.log(`[config] loading config from ${CONFIG_PATH}`);
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  let cfg: ConfigFile;
  try {
    cfg = JSON.parse(raw) as ConfigFile;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[config] failed to parse ${CONFIG_PATH}: ${detail}`);
    throw new Error(`config: failed to parse ${CONFIG_PATH}: ${detail}`);
  }

  try {
    validateConfig(cfg);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[config] validation failed: ${detail}`);
    throw err;
  }

  let migrated = false;

  // Persist default ext values into the config file
  if (!cfg.metaExts) {
    cfg.metaExts = DEFAULT_META_EXTS;
    migrated = true;
  }
  if (!cfg.videoExts) {
    cfg.videoExts = DEFAULT_VIDEO_EXTS;
    migrated = true;
  }

  const common = cfg.remote || {};
  const commonRateLimit: Partial<RateLimitConfig> = cfg.rateLimit || {};
  const commonCron = cfg.cron;
  const globalMetaExts = parseExtStr(cfg.metaExts, DEFAULT_META_EXTS);
  const globalVideoExts = parseExtStr(cfg.videoExts, DEFAULT_VIDEO_EXTS);

  const tasks = cfg.tasks.map((task): TaskConfig => {
    if (!task.key || task.key.startsWith('__tmp__:')) {
      task.key = crypto.randomUUID();
      migrated = true;
    }

    const merged: RemoteConfig = { ...common, ...task.remote };
    const cron = task.cron || commonCron;

    merged.url = merged.url!.replace(/\/+$/, '');
    merged.path = '/' + merged.path!.replace(/^\/+|\/+$/g, '');
    merged.syncMetadata ??= true;

    const jellyfin = task.jellyfin || cfg.jellyfin;

    const metaExts = mergeExtSets(globalMetaExts, task.metaExts);
    const videoExts = mergeExtSets(globalVideoExts, task.videoExts);

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
      metaExts,
      videoExts,
    };
  });

  if (migrated) {
    const tmpPath = CONFIG_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(cfg, null, 2), 'utf-8');
    fs.renameSync(tmpPath, CONFIG_PATH);
    console.log(`[config] migrated config file`);
  }

  console.log(`[config] loaded ${tasks.length} task(s) successfully`);
  return tasks;
}
