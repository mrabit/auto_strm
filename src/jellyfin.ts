import type { JellyfinConfig } from './config.js';

export async function refreshLibrary(jellyfin: JellyfinConfig): Promise<void> {
  const url = jellyfin.url.replace(/\/+$/, '') + '/Library/Refresh';
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'X-MediaBrowser-Token': jellyfin.token },
    });
    if (!resp.ok) {
      console.warn(`[jellyfin] library refresh returned HTTP ${resp.status}: ${resp.statusText}`);
    } else {
      console.log(`[jellyfin] library refresh queued`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[jellyfin] library refresh failed: ${msg}`);
  }
}
