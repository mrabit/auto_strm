export interface Todo {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}
