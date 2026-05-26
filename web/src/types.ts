export interface RemoteConfig {
  url?: string;
  username?: string;
  password?: string;
  path?: string;
  publicUrl?: string;
  syncMetadata?: boolean;
}

export interface RateLimitConfig {
  concurrency?: number;
  intervalMs?: number;
}

export interface JellyfinConfig {
  url: string;
  token: string;
  enabled?: boolean;
}

export interface LocalConfig {
  path: string;
}

export interface RawTaskConfig {
  name: string;
  enabled?: boolean;
  remote: RemoteConfig;
  local: LocalConfig;
  cron?: string;
  rateLimit?: RateLimitConfig;
  jellyfin?: JellyfinConfig;
  metaExts?: string;
  videoExts?: string;
  key?: string;
}

export interface ConfigFile {
  remote?: RemoteConfig;
  cron?: string;
  rateLimit?: RateLimitConfig;
  jellyfin?: JellyfinConfig;
  metaExts?: string;
  videoExts?: string;
  tasks: RawTaskConfig[];
  lastSyncTimes?: Record<string, string>;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}
