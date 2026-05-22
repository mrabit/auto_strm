import './logger'; // must be first to capture all console output
import fs from 'node:fs';
import type { Server } from 'node:http';
import { createClient } from 'webdav';
import { load, CONFIG_PATH } from './config';
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

async function runTask(task: TaskConfig, overrideRemotePath?: string): Promise<void> {
  const startedAt = Date.now();
  const logPrefix = cyan(`[${task.name}]`);
  const scanPath = overrideRemotePath || task.remote.path;
  const isPartial = !!overrideRemotePath;
  console.log(
    `${logPrefix} ${dim('syncing...')}${isPartial ? ' ' + dim(`(partial: ${scanPath})`) : ''}`,
  );

  try {
    const client = createClient(task.remote.url, {
      username: task.remote.username,
      password: task.remote.password,
    });

    const { metadataFiles, videoFiles } = await scan(client, scanPath, task.rateLimit.intervalMs);

    let pathPrefix = '';
    if (isPartial) {
      const offset = overrideRemotePath!.slice(task.remote.path.length).replace(/^\//, '');
      if (offset) pathPrefix = offset + '/';
    }
    const allMetadata = isPartial
      ? metadataFiles.map((f) => ({ ...f, relativePath: pathPrefix + f.relativePath }))
      : metadataFiles;
    const allVideos = isPartial
      ? videoFiles.map((f) => ({ ...f, relativePath: pathPrefix + f.relativePath }))
      : videoFiles;

    console.log(
      `${logPrefix} found ${bold(String(allMetadata.length))} metadata files, ${bold(String(allVideos.length))} videos`,
    );

    let metaDownloaded = 0;
    let metaSkipped = 0;

    if (task.remote.syncMetadata) {
      const results = await runWithLimit(
        allMetadata,
        (file) => syncMetadata(client, file, task.local.path),
        task.rateLimit.concurrency,
        task.rateLimit.intervalMs,
      );
      metaDownloaded = results.filter((r) => r === 'downloaded').length;
      metaSkipped = results.filter((r) => r === 'skipped').length;
    }

    const strmResults = await runWithLimit(
      allVideos,
      (file) => generateStrm(file, task.remote, task.local.path),
      task.rateLimit.concurrency,
      task.rateLimit.intervalMs,
    );
    const strmGenerated = strmResults.filter((r) => r === 'generated').length;
    const strmSkipped = strmResults.filter((r) => r === 'skipped').length;

    if (strmGenerated > 0 && task.jellyfin && task.jellyfin.enabled !== false) {
      const { refreshLibrary } = await import('./jellyfin.js');
      await refreshLibrary(task.jellyfin);
    }

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

async function main() {
  const allTasks = load();
  const enabled = allTasks.filter((t) => t.enabled);
  if (enabled.length < allTasks.length) {
    const skipped = allTasks
      .filter((t) => !t.enabled)
      .map((t) => t.name)
      .join(', ');
    console.log(`${dim('skipped disabled tasks:')} ${skipped}`);
  }
  console.log(`loaded ${bold(String(enabled.length))} task(s)`);

  let running = 0;
  const runningTasks = new Set<string>();
  let shuttingDown = false;

  async function runTaskTracked(task: TaskConfig, overrideRemotePath?: string): Promise<void> {
    if (shuttingDown || runningTasks.has(task.name)) return;
    runningTasks.add(task.name);
    running++;
    try {
      await runTask(task, overrideRemotePath);
    } finally {
      running--;
      runningTasks.delete(task.name);
    }
  }

  const handle: SchedulerHandle = start(enabled, runTaskTracked);

  let watchTimer: ReturnType<typeof setTimeout> | null = null;
  fs.watchFile(CONFIG_PATH, { interval: 1000 }, () => {
    if (watchTimer) clearTimeout(watchTimer);
    watchTimer = setTimeout(() => {
      watchTimer = null;
      try {
        const newAll = load();
        const newEnabled = newAll.filter((t) => t.enabled);
        console.log(
          `${yellow('config changed')}, ${bold(String(newEnabled.length))} task(s) reloaded`,
        );
        handle.update(newEnabled);
        if (updateServerTasks) updateServerTasks(newAll);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`${red('config reload error:')} ${msg}`);
      }
    }, 1000);
  });

  // Web server (opt-in via WEB_PORT env)
  let webServer: Server | null = null;
  let updateServerTasks: ((tasks: TaskConfig[]) => void) | null = null;
  const webPort = parseInt(process.env.WEB_PORT || '', 10);
  if (webPort > 0) {
    const { startServer } = await import('./server.js');
    const result = await startServer(webPort, CONFIG_PATH, handle, runTaskTracked, allTasks);
    webServer = result.server;
    updateServerTasks = result.updateTasks;
  }

  const SHUTDOWN_TIMEOUT = 30_000;

  function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${yellow('received ' + signal)}, shutting down...`);
    handle.stop();

    fs.unwatchFile(CONFIG_PATH);
    if (watchTimer) clearTimeout(watchTimer);

    if (webServer) {
      webServer.close();
    }

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
}

main();
