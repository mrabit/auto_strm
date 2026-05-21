export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

const MAX_ENTRIES = 1000;
const buffer: LogEntry[] = [];

function pad(n: number) {
  return String(n).padStart(2, '0');
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
  if (buffer.length > MAX_ENTRIES) buffer.shift();
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
