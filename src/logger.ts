import { pad } from './utils';

export interface LogEntry {
  boot: number;
  seq: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

// 进程启动标识：seq 仅在同一 boot 内单调。后端重启后 boot 变化，
// 前端据此识别“换了一代服务端”并重置基线，避免旧高 seq 误杀新日志。
const BOOT_ID = Date.now();
const MAX_ENTRIES = 1000;
const buffer: LogEntry[] = [];
let seqCounter = 0;

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
  buffer.push({ boot: BOOT_ID, seq: seqCounter++, timestamp: fmtTime(new Date()), level, message });
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
