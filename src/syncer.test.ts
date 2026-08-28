import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeToFile } from './syncer';

let tmpDir: string;
let dest: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syncer-test-'));
  dest = path.join(tmpDir, 'out.bin');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('pipeToFile', () => {
  it('writes the full stream to disk and resolves', async () => {
    const readable = Readable.from(['hello ', 'world']);
    await pipeToFile(readable, dest, 1000);
    expect(fs.readFileSync(dest, 'utf-8')).toBe('hello world');
  });

  it('aborts and deletes the file when the stream goes idle', async () => {
    // Emits one chunk then stalls forever — no 'end', no 'error'.
    const readable = new Readable({ read() {} });
    readable.push('partial');

    await expect(pipeToFile(readable, dest, 50)).rejects.toThrow(/idle timeout/);
    expect(fs.existsSync(dest)).toBe(false);
  });

  it('deletes the partial file when the stream errors', async () => {
    const readable = new Readable({ read() {} });
    readable.push('some data');
    queueMicrotask(() => readable.destroy(new Error('connection reset')));

    await expect(pipeToFile(readable, dest, 1000)).rejects.toThrow('connection reset');
    expect(fs.existsSync(dest)).toBe(false);
  });

  it('does not time out while data keeps flowing (idle, not total, timeout)', async () => {
    // Pushes 5 chunks at 20ms intervals (100ms total) with a 50ms idle window.
    // Total time exceeds the timeout, but no single gap does — must succeed.
    const readable = new Readable({ read() {} });
    let n = 0;
    const iv = setInterval(() => {
      if (n < 5) {
        readable.push(`chunk${n++} `);
      } else {
        clearInterval(iv);
        readable.push(null);
      }
    }, 20);

    await pipeToFile(readable, dest, 50);
    expect(fs.readFileSync(dest, 'utf-8')).toBe('chunk0 chunk1 chunk2 chunk3 chunk4 ');
  });
});
