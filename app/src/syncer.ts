import fs from 'node:fs';
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

function pipeToFile(readable: NodeJS.ReadableStream, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const writable = fs.createWriteStream(dest);
    const cleanup = () => {
      try {
        fs.unlinkSync(dest);
      } catch {
        /* best effort */
      }
    };
    readable.pipe(writable);
    writable.on('finish', resolve);
    writable.on('error', (err) => {
      cleanup();
      reject(err);
    });
    readable.on('error', (err) => {
      writable.destroy();
      cleanup();
      reject(err);
    });
  });
}

function shouldDownload(dest: string): boolean {
  return !fs.existsSync(dest);
}
