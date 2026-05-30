import { pad } from './utils';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

const MAX_ENTRIES = 1000;
const buffer: LogEntry[] = [];

type Listener = (entry: LogEntry) => void;
const listeners = new Set<Listener>();

export function onLog(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function fmtTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function push(level: LogEntry['level'], args: unknown[]): void {
  const message = args
    .map((a) => {
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
  buffer.push({ timestamp: fmtTime(new Date()), level, message });
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
  const entry = buffer[buffer.length - 1];
  for (const fn of listeners) {
    try {
      fn(entry);
    } catch {
      // failed listener, skip
    }
  }
}

const orig = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

console.log = (...args: unknown[]) => {
  push('info', args);
  orig.log(...args);
};

console.warn = (...args: unknown[]) => {
  push('warn', args);
  orig.warn(...args);
};

console.error = (...args: unknown[]) => {
  push('error', args);
  orig.error(...args);
};

export function getLogs(): LogEntry[] {
  return [...buffer];
}

export function restoreConsole(): void {
  console.log = orig.log;
  console.warn = orig.warn;
  console.error = orig.error;
}
