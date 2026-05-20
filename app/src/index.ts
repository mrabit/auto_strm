import { createClient } from 'webdav';
import { load } from './config';
import { scan } from './scanner';
import { syncMetadata, generateStrm } from './syncer';
import { start } from './scheduler';
import type { SchedulerHandle } from './scheduler';
import type { TaskConfig } from './config';

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function dim(s: string) {
  return C.dim + s + C.reset;
}
function bold(s: string) {
  return C.bold + s + C.reset;
}
function green(s: string) {
  return C.green + s + C.reset;
}
function yellow(s: string) {
  return C.yellow + s + C.reset;
}
function cyan(s: string) {
  return C.cyan + s + C.reset;
}
function red(s: string) {
  return C.red + s + C.reset;
}

function formatTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function runTask(task: TaskConfig): Promise<void> {
  const startedAt = Date.now();
  const logPrefix = cyan(`[${task.name}]`);
  console.log(`${logPrefix} ${dim('syncing...')}`);

  try {
    const client = createClient(task.remote.url, {
      username: task.remote.username,
      password: task.remote.password,
    });

    const { metadataFiles, videoFiles } = await scan(
      client,
      task.remote.path,
      task.rateLimit.intervalMs,
    );

    console.log(
      `${logPrefix} found ${bold(String(metadataFiles.length))} metadata files, ${bold(String(videoFiles.length))} videos`,
    );

    let metaDownloaded = 0;
    let metaSkipped = 0;

    if (task.remote.syncMetadata) {
      const results = await runWithLimit(
        metadataFiles,
        (file) => syncMetadata(client, file, task.local.path),
        task.rateLimit.concurrency,
        task.rateLimit.intervalMs,
      );
      metaDownloaded = results.filter((r) => r === 'downloaded').length;
      metaSkipped = results.filter((r) => r === 'skipped').length;
    }

    const strmResults = await runWithLimit(
      videoFiles,
      (file) => generateStrm(file, task.remote, task.local.path),
      task.rateLimit.concurrency,
      task.rateLimit.intervalMs,
    );
    const strmGenerated = strmResults.filter((r) => r === 'generated').length;
    const strmSkipped = strmResults.filter((r) => r === 'skipped').length;

    const endedAt = formatTime(new Date());
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(
      `${logPrefix} ${green('done')} ${dim(endedAt)} ${bold(`(${elapsed}s)`)} — metadata: ${green(String(metaDownloaded))} downloaded, ${yellow(String(metaSkipped))} skipped | strm: ${green(String(strmGenerated))} generated, ${yellow(String(strmSkipped))} skipped`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} ${red('error')}:`, msg);
  }
}

async function runWithLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
  intervalMs: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
      if (intervalMs > 0) await delay(intervalMs);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

const tasks = load();
console.log(`loaded ${bold(String(tasks.length))} task(s)`);

let running = 0;
const runningTasks = new Set<string>();
let shuttingDown = false;

async function runTaskTracked(task: TaskConfig): Promise<void> {
  if (shuttingDown || runningTasks.has(task.name)) return;
  runningTasks.add(task.name);
  running++;
  try {
    await runTask(task);
  } finally {
    running--;
    runningTasks.delete(task.name);
  }
}

const handle: SchedulerHandle = start(tasks, runTaskTracked);

const SHUTDOWN_TIMEOUT = 30_000;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${yellow('received ' + signal)}, shutting down...`);
  handle.stop();

  if (process.env.NODE_ENV === 'development') {
    console.log('dev mode, exiting immediately');
    process.exit(0);
  }

  const forcedExit = setTimeout(() => {
    console.log(`shutdown timeout, ${running} task(s) still running — force exit`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  const check = setInterval(() => {
    if (running === 0) {
      clearTimeout(forcedExit);
      clearInterval(check);
      console.log('all tasks finished, exiting');
      process.exit(0);
    }
  }, 200);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
