import type { WebDAVClient } from 'webdav';
import { delay, errorMessage } from './utils';

export interface MetadataFile {
  remotePath: string;
  relativePath: string;
}

export interface VideoFile {
  remotePath: string;
  relativePath: string;
}

export interface ScanResult {
  metadataFiles: MetadataFile[];
  videoFiles: VideoFile[];
}

interface DirectoryItem {
  filename: string;
  basename: string;
  type: 'file' | 'directory';
  size: number;
  lastmod: string;
  ext?: string;
  mime?: string;
}

export async function scan(
  client: WebDAVClient,
  remotePath: string,
  metaExts: Set<string>,
  videoExts: Set<string>,
  intervalMs = 0,
  dirConcurrency = 3,
): Promise<ScanResult> {
  const metadataFiles: MetadataFile[] = [];
  const videoFiles: VideoFile[] = [];
  let skippedDirs = 0;

  async function walk(dirPath: string, relDir: string, isRoot = false): Promise<void> {
    let items: DirectoryItem[];
    try {
      items = (await client.getDirectoryContents(dirPath)) as DirectoryItem[];
    } catch (err) {
      const status = (err as { status?: number })?.status;
      // Root directory failure is fatal (bad host/path/credentials) — surface it
      // so the task is marked failed instead of silently reporting "0 files, done".
      if (isRoot) {
        throw new Error(`cannot read root directory (HTTP ${status ?? '?'}): ${errorMessage(err)}`);
      }
      console.warn(
        `[scanner] skip directory (HTTP ${status ?? '?'}): ${dirPath} — ${errorMessage(err)}`,
      );
      skippedDirs++;
      return;
    }
    if (intervalMs > 0) await delay(intervalMs);

    const subDirs: { path: string; rel: string }[] = [];

    for (const item of items) {
      if (item.type === 'directory') {
        subDirs.push({ path: item.filename, rel: relDir + item.basename + '/' });
      } else if (item.type === 'file') {
        const ext = item.ext || pathExtname(item.basename);

        if (videoExts.has(ext)) {
          videoFiles.push({
            remotePath: item.filename,
            relativePath: relDir + item.basename,
          });
        } else if (metaExts.has(ext)) {
          metadataFiles.push({
            remotePath: item.filename,
            relativePath: relDir + item.basename,
          });
        }
      }
    }

    // Traverse same-level directories with limited concurrency
    let idx = 0;
    async function dirWorker(): Promise<void> {
      while (idx < subDirs.length) {
        const d = subDirs[idx++];
        await walk(d.path, d.rel);
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(dirConcurrency, subDirs.length) }, () => dirWorker()),
    );
  }

  await walk(remotePath, '', true);
  if (skippedDirs > 0) {
    console.warn(
      `[scanner] skipped ${skippedDirs} director${skippedDirs === 1 ? 'y' : 'ies'} due to errors`,
    );
  }
  return { metadataFiles, videoFiles };
}

function pathExtname(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i > 0 ? filename.slice(i).toLowerCase() : '';
}
