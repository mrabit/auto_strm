import type { WebDAVClient } from 'webdav';

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

    for (const item of items) {
      if (item.type === 'directory') {
        await walk(item.filename, relDir + item.basename + '/');
      } else if (item.type === 'file') {
        const ext = item.ext || pathExtname(item.basename);
        const lower = ext.toLowerCase();

        if (videoExts.has(lower)) {
          videoFiles.push({
            remotePath: item.filename,
            relativePath: relDir + item.basename,
          });
        } else if (metaExts.has(lower)) {
          metadataFiles.push({
            remotePath: item.filename,
            relativePath: relDir + item.basename,
          });
        }
      }
    }
  }

  await walk(remotePath, '');
  return { metadataFiles, videoFiles };
}

function pathExtname(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i > 0 ? filename.slice(i).toLowerCase() : '';
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
