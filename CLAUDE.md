# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Dockerized TypeScript app that syncs media metadata from WebDAV and generates `.strm` files for video files. Runs on a cron schedule. Supports multiple sync tasks with independent configs.

## Commands

```bash
# Install dependencies
cd app && npm install

# Dev mode with auto-reload (reads config/dev.json)
cd app && npm run dev

# Type-check and compile
cd app && npm run build

# Run compiled output
cd app && npm start

# Docker
docker compose up --build
```

## Architecture

```
app/
├── config/
│   ├── default.json       # Production config (volume-mounted in Docker)
│   └── dev.json           # Dev config, only loaded when NODE_ENV=development
├── src/
│   ├── index.ts           # Entry: loads config, starts scheduler, concurrency & graceful shutdown
│   ├── config.ts          # Reads & validates config, selects file by NODE_ENV
│   ├── scanner.ts         # Recursively lists WebDAV dir, classifies files
│   ├── syncer.ts          # Downloads metadata, generates .strm files (buildStrmUrl)
│   └── scheduler.ts       # Cron scheduling, fires immediately then on schedule, returns stop handle
├── tsconfig.json
├── package.json
└── data/                  # Local sync destination (Docker volume mount)
```

**Flow**: `index.ts` → `config.load()` → `scheduler.start(tasks, runTaskTracked)` → for each task: `createClient(url, {username, password})` → `scanner.scan()` → (if syncMetadata) concurrent `syncer.syncMetadata()` → concurrent `syncer.generateStrm()` → log stats. On SIGTERM/SIGINT: stop cron jobs, wait for in-flight tasks, exit.

## Config schema

```typescript
interface RemoteConfig {
  url: string;           // WebDAV endpoint (e.g. https://cd2.mac.mrabit.com/dav)
  username: string;
  password: string;
  path: string;          // remote path to scan
  publicUrl?: string;    // optional: override streaming host in strm URLs
  syncMetadata?: boolean; // default true, set false to skip metadata download
}
```

## .strm URL format

CloudDrive2 streaming format: `{base}/static/{proto}/{host}/False{encodedRemotePath}/{encodedVideoPath}`

- `base` = `publicUrl` if set, otherwise origin extracted from `remote.url`
- `proto` = protocol extracted from `base` (e.g. `http`, `https`)
- `host` = hostname:port parsed from `base`
- `encodedRemotePath` = `remote.path` with each segment `encodeURIComponent` encoded
- `encodedVideoPath` = video relative path with each segment `encodeURIComponent` encoded
- `.strm` file replaces video extension (e.g. `movie.strm`, not `movie.mp4.strm`)

## Concurrency

Metadata downloads and strm generation run concurrently within each task (default 10 workers, see `CONCURRENCY` in `index.ts`).

## Key types

- `TaskConfig` / `RemoteConfig` / `LocalConfig` — defined in `config.ts`
- `MetadataFile` / `VideoFile` / `ScanResult` — defined in `scanner.ts`
- `SchedulerHandle` — `{ stop: () => void }`, returned by `scheduler.start()`

## Key behaviors

- **Incremental sync**: metadata files are skipped if the local file already exists (existence-only check, no size/mtime comparison). `.strm` files are skipped if content matches.
- **Error cleanup**: partial downloads are deleted on failure so the next run retries cleanly.
- **Graceful shutdown**: on SIGTERM/SIGINT, cron jobs are stopped and in-flight tasks allowed to finish before exit (30s timeout, then force exit).
- **Re-entrance guard**: if a cron trigger fires while the previous run of the same task is still in progress, the new trigger is skipped.

## Key libraries

- `webdav` (v5) — WebDAV client: `createClient`, `getDirectoryContents`, `createReadStream`
- `cron` (v3) — `CronJob` for scheduling
- `tsx` — TypeScript runner for dev mode

## File classification

Metadata extensions synced as-is: `.nfo .jpg .jpeg .png .svg .ass .ssa .srt .sup .mp3 .flac .wav .aac`

Video extensions trigger `.strm` generation: `.mkv .iso .ts .mp4 .avi .rmvb .wmv .m2ts .mpg .flv .rm .mov`
