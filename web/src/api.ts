import type { ConfigFile, LogEntry } from './types';

async function handleError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
}

export async function fetchConfig(): Promise<ConfigFile> {
  const res = await fetch('/api/config');
  if (!res.ok) return handleError(res);
  return res.json();
}

export async function saveConfig(config: ConfigFile): Promise<void> {
  const res = await fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) return handleError(res);
}

export async function syncTask(name: string): Promise<void> {
  const res = await fetch(`/api/tasks/${encodeURIComponent(name)}/sync`, { method: 'POST' });
  if (!res.ok) return handleError(res);
}

export async function fetchLogs(): Promise<LogEntry[]> {
  const res = await fetch('/api/logs');
  if (!res.ok) return handleError(res);
  return res.json();
}
