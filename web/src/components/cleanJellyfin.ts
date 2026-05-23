import type { JellyfinConfig } from '../types';

export function cleanJellyfin(
  v: Partial<JellyfinConfig>,
): JellyfinConfig | undefined {
  return v.url || v.token || v.enabled !== undefined
    ? ({ url: v.url ?? '', token: v.token ?? '', enabled: v.enabled } as JellyfinConfig)
    : undefined;
}
