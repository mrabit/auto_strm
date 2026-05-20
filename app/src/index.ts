import { createClient } from 'webdav';
import { load } from './config';
import { scan } from './scanner';
import { syncMetadata, generateStrm } from './syncer';
import { start } from './scheduler';
import type { SchedulerHandle } from './scheduler';
import type { TaskConfig } from './config';

const CONCURRENCY = 10;

function formatTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function runTask(task: TaskConfig): Promise<void> {
  const startedAt = Date.now();
  const logPrefix = `[${task.name}]`;
  console.log(`${logPrefix} syncing...`);

  try {
    const client = createClient(task.remote.url, {
      username: task.remote.username,
      password: task.remote.password,
    });

    const { metadataFiles, videoFiles } = await scan(client, task.remote.path);

    console.log(
      `${logPrefix} found ${metadataFiles.length} metadata files, ${videoFiles.length} videos`,
    );

    let metaDownloaded = 0;
    let metaSkipped = 0;

    if (task.remote.syncMetadata) {
      const results = await runWithLimit(metadataFiles, (file) =>
        syncMetadata(client, file, task.local.path),
      );
      metaDownloaded = results.filter((r) => r === 'downloaded').length;
      metaSkipped = results.filter((r) => r === 'skipped').length;
    }

    const strmResults = await runWithLimit(videoFiles, (file) =>
      generateStrm(file, task.remote, task.local.path),
    );
    const strmGenerated = strmResults.filter((r) => r === 'generated').length;
    const strmSkipped = strmResults.filter((r) => r === 'skipped').length;

    const endedAt = formatTime(new Date());
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(
      `${logPrefix} done ${endedAt} (${elapsed}s) — metadata: ${metaDownloaded} downloaded, ${metaSkipped} skipped | strm: ${strmGenerated} generated, ${strmSkipped} skipped`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${logPrefix} error:`, msg);
  }
}

async function runWithLimit<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

const tasks = load();
console.log(`loaded ${tasks.length} task(s)`);

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
  console.log(`\nreceived ${signal}, shutting down...`);
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
