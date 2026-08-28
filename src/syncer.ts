import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import type { WebDAVClient } from 'webdav';
import type { ResolvedRemoteConfig } from './config';
import type { MetadataFile, VideoFile } from './scanner';

export async function syncMetadata(
  client: WebDAVClient,
  file: MetadataFile,
  localBase: string,
): Promise<'downloaded' | 'skipped'> {
  const dest = path.join(localBase, file.relativePath);
  if (!shouldDownload(dest)) return 'skipped';

  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await pipeToFile(client.createReadStream(file.remotePath), dest);
  return 'downloaded';
}

export async function generateStrm(
  file: VideoFile,
  remoteConfig: ResolvedRemoteConfig,
  localBase: string,
): Promise<'generated' | 'skipped'> {
  const parsed = path.parse(file.relativePath);
  const strmName = parsed.name + '.strm';
  const strmPath = path.join(localBase, parsed.dir, strmName);
  const strmDir = path.dirname(strmPath);

  const remoteUrl = buildStrmUrl(file.relativePath, remoteConfig);

  const content = remoteUrl + '\n';

  if (strmContentMatches(strmPath, remoteUrl)) return 'skipped';

  await fs.promises.mkdir(strmDir, { recursive: true });
  await fs.promises.writeFile(strmPath, content, 'utf-8');
  return 'generated';
}

function strmContentMatches(strmPath: string, remoteUrl: string): boolean {
  try {
    if (fs.existsSync(strmPath)) {
      const existing = fs.readFileSync(strmPath, 'utf-8');
      return existing.trim() === remoteUrl.trim();
    }
  } catch {
    // permission or disk error — treat as mismatch, regenerate
  }
  return false;
}

function buildStrmUrl(relativePath: string, remoteConfig: ResolvedRemoteConfig): string {
  const base = remoteConfig.publicUrl || new URL(remoteConfig.url).origin;
  const baseUrl = new URL(base);
  const proto = baseUrl.protocol.replace(':', '');
  const host = baseUrl.host;
  const encodedPath = remoteConfig.path.split('/').map(encodeURIComponent).join('/');
  const encodedFile = relativePath
    .split('\\')
    .join('/')
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  return (
    base.replace(/\/+$/, '') +
    '/static/' +
    proto +
    '/' +
    host +
    '/False' +
    encodedPath +
    '/' +
    encodedFile
  );
}

// Abort a download if no data flows for this long. Guards against dead
// connections where the WebDAV read stream silently stalls — no 'end', no
// 'error' — leaving pipeline() (and its worker) hung forever.
const IDLE_TIMEOUT_MS = 30_000;

export async function pipeToFile(
  readable: NodeJS.ReadableStream,
  dest: string,
  idleTimeoutMs: number = IDLE_TIMEOUT_MS,
): Promise<void> {
  const writable = fs.createWriteStream(dest);
  const controller = new AbortController();

  // Idle watchdog: reset whenever either end makes progress; fire only after a
  // full window with no progress on either side. Listening to writable 'drain'
  // (not just readable 'data') is essential: under backpressure pipeline()
  // pauses the readable so 'data' stops, but a healthy-but-slow disk keeps
  // emitting 'drain' as it flushes — without this a slow mount would false-abort.
  let timer: NodeJS.Timeout | undefined;
  const resetTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      controller.abort(new Error(`idle timeout after ${idleTimeoutMs}ms`));
    }, idleTimeoutMs);
  };
  readable.on('data', resetTimer);
  writable.on('drain', resetTimer);
  resetTimer();

  try {
    await pipeline(readable, writable, { signal: controller.signal });
  } catch (err) {
    try {
      fs.unlinkSync(dest);
    } catch {
      /* best effort */
    }
    // On abort, pipeline throws a generic AbortError; surface our idle-timeout
    // reason instead so the failure log is meaningful.
    if (controller.signal.aborted && controller.signal.reason instanceof Error) {
      throw controller.signal.reason;
    }
    throw err;
  } finally {
    clearTimeout(timer);
    readable.off('data', resetTimer);
    writable.off('drain', resetTimer);
  }
}

function shouldDownload(dest: string): boolean {
  return !fs.existsSync(dest);
}
