import type { SeriesUpdate, LogEntry } from './types';

async function handleError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
}

export async function fetchSeriesUpdates(search?: string): Promise<SeriesUpdate[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`/api/seriesupdates${params}`);
  if (!res.ok) return handleError(res);
  return res.json();
}

export async function createSeriesUpdate(
  data: Omit<SeriesUpdate, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<SeriesUpdate> {
  const res = await fetch('/api/seriesupdates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) return handleError(res);
  return res.json();
}

export async function updateSeriesUpdate(
  id: string,
  data: Partial<Omit<SeriesUpdate, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<SeriesUpdate> {
  const res = await fetch(`/api/seriesupdates/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) return handleError(res);
  return res.json();
}

export async function deleteSeriesUpdate(id: string): Promise<void> {
  const res = await fetch(`/api/seriesupdates/${encodeURIComponent(id)}`, { method: 'DELETE' });
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
  return () => es.close();
}
