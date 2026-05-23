import type { WebDAVClient } from 'webdav';
import { delay } from './utils';

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

const metaExts = new Set([
  '.nfo',
  '.jpg',
  '.jpeg',
  '.png',
  '.svg',
  '.ass',
  '.ssa',
  '.srt',
  '.sup',
  '.mp3',
  '.flac',
  '.wav',
  '.aac',
]);

const videoExts = new Set([
  '.mkv',
  '.iso',
  '.ts',
  '.mp4',
  '.avi',
  '.rmvb',
  '.wmv',
  '.m2ts',
  '.mpg',
  '.flv',
  '.rm',
  '.mov',
]);

export async function scan(
  client: WebDAVClient,
  remotePath: string,
  intervalMs = 0,
): Promise<ScanResult> {
  const metadataFiles: MetadataFile[] = [];
  const videoFiles: VideoFile[] = [];

  async function walk(dirPath: string, relDir: string): Promise<void> {
    const items = (await client.getDirectoryContents(dirPath)) as DirectoryItem[];
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

    // Traverse same-level directories concurrently
    await Promise.all(subDirs.map((d) => walk(d.path, d.rel)));
  }

  await walk(remotePath, '');
  return { metadataFiles, videoFiles };
}

function pathExtname(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i > 0 ? filename.slice(i).toLowerCase() : '';
}
