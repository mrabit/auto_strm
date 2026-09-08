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

export async function syncTask(key: string): Promise<void> {
  const res = await fetch(`/api/tasks/${encodeURIComponent(key)}/sync`, { method: 'POST' });
  if (!res.ok) return handleError(res);
}

export async function fetchLogs(): Promise<LogEntry[]> {
  const res = await fetch('/api/logs');
  if (!res.ok) return handleError(res);
  return res.json();
}

export function subscribeLogs(onEntry: (entry: LogEntry) => void): () => void {
  const es = new EventSource('/api/logs/stream');
  es.onmessage = (e) => {
    try {
      onEntry(JSON.parse(e.data));
    } catch {
      // malformed data, ignore
    }
  };
  // 连接断开（长任务/网络抖动/代理超时）。EventSource 会自动重连，
  // 重连后服务端全量回放历史，由调用方按 seq 去重。这里只警告一次，
  // 避免后端长时间不可用时每次重试都刷控制台。
  let warned = false;
  es.onerror = () => {
    if (!warned) {
      console.warn('[logs] SSE connection error, will auto-reconnect');
      warned = true;
    }
  };
  es.onopen = () => {
    warned = false;
  };
  return () => es.close();
}
