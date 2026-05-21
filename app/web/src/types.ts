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
  _key?: string;
}

export interface ConfigFile {
  remote?: RemoteConfig;
  cron?: string;
  rateLimit?: RateLimitConfig;
  tasks: RawTaskConfig[];
}
