import type { Todo, LogEntry } from './types';

async function handleError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
}

export async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch('/api/todos');
  if (!res.ok) return handleError(res);
  return res.json();
}

export async function createTodo(title: string): Promise<Todo> {
  const res = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) return handleError(res);
  return res.json();
}

export async function updateTodo(
  id: string,
  data: { title?: string; done?: boolean },
): Promise<Todo> {
  const res = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) return handleError(res);
  return res.json();
}

export async function deleteTodo(id: string): Promise<void> {
  const res = await fetch(`/api/todos/${encodeURIComponent(id)}`, { method: 'DELETE' });
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
