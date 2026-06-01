import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// 使用 vi.hoisted 让 items 在 mock 工厂外部也可访问，便于 beforeEach 重置
const { items } = vi.hoisted(() => {
  const items: {
    id: string;
    name: string;
    SERIES_ID: string;
    SEASON_ID: string;
    URL: string;
    createdAt: string;
    updatedAt: string;
  }[] = [];
  return { items };
});

// Mock db module to avoid requiring a live Strapi instance
vi.mock('../db', () => {
  return {
    default: {
      getSeriesUpdates: vi.fn(async (search?: string) => {
        if (!search) return items;
        const q = search.toLowerCase();
        return items.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.SERIES_ID.toLowerCase().includes(q) ||
            t.SEASON_ID.toLowerCase().includes(q),
        );
      }),
      createSeriesUpdate: vi.fn(
        async (data: { name: string; SERIES_ID?: string; SEASON_ID?: string; URL?: string }) => {
          const item = {
            id: crypto.randomUUID(),
            name: data.name,
            SERIES_ID: data.SERIES_ID ?? '',
            SEASON_ID: data.SEASON_ID ?? '',
            URL: data.URL ?? '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          items.push(item);
          return item;
        },
      ),
      updateSeriesUpdate: vi.fn(
        async (
          id: string,
          data: { name?: string; SERIES_ID?: string; SEASON_ID?: string; URL?: string },
        ) => {
          const item = items.find((t) => t.id === id);
          if (!item) {
            const err = new Error('not found') as Error & { status: number };
            err.status = 404;
            throw err;
          }
          if (data.name !== undefined) item.name = data.name;
          if (data.SERIES_ID !== undefined) item.SERIES_ID = data.SERIES_ID;
          if (data.SEASON_ID !== undefined) item.SEASON_ID = data.SEASON_ID;
          if (data.URL !== undefined) item.URL = data.URL;
          item.updatedAt = new Date().toISOString();
          return item;
        },
      ),
      deleteSeriesUpdate: vi.fn(async (id: string) => {
        const index = items.findIndex((t) => t.id === id);
        if (index === -1) {
          const err = new Error('not found') as Error & { status: number };
          err.status = 404;
          throw err;
        }
        items.splice(index, 1);
      }),
    },
  };
});

import { startServer } from '../server';

describe('API Server', () => {
  let server: Awaited<ReturnType<typeof startServer>>['server'];
  let close: () => void;
  let baseUrl: string;

  beforeAll(async () => {
    const result = await startServer(0); // random port
    server = result.server;
    close = result.close;
    const address = server.address();
    if (address && typeof address === 'object') {
      baseUrl = `http://localhost:${address.port}`;
    }
  });

  beforeEach(() => {
    items.length = 0;
  });

  afterAll(() => {
    close();
  });

  it('GET /api/health returns ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('GET /api/seriesupdates returns array', async () => {
    const res = await fetch(`${baseUrl}/api/seriesupdates`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('POST /api/seriesupdates creates a record', async () => {
    const res = await fetch(`${baseUrl}/api/seriesupdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '测试剧集',
        SERIES_ID: 'abc',
        SEASON_ID: 'def',
        URL: 'https://example.com',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ name: '测试剧集', SERIES_ID: 'abc' });
    expect(body.id).toBeDefined();
  });

  it('POST /api/seriesupdates without name returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/seriesupdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('PUT /api/seriesupdates/:id updates a record', async () => {
    // 先创建一条记录
    const createRes = await fetch(`${baseUrl}/api/seriesupdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '原名称', SERIES_ID: 'old' }),
    });
    const created = await createRes.json();

    const res = await fetch(`${baseUrl}/api/seriesupdates/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '新名称', SERIES_ID: 'new' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ name: '新名称', SERIES_ID: 'new', id: created.id });
  });

  it('PUT /api/seriesupdates/:id with empty name returns 400', async () => {
    const createRes = await fetch(`${baseUrl}/api/seriesupdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '测试' }),
    });
    const created = await createRes.json();

    const res = await fetch(`${baseUrl}/api/seriesupdates/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('PUT /api/seriesupdates/:id with nonexistent id returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/seriesupdates/nonexistent-id`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/seriesupdates/:id deletes a record', async () => {
    const createRes = await fetch(`${baseUrl}/api/seriesupdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '待删除' }),
    });
    const created = await createRes.json();

    const res = await fetch(`${baseUrl}/api/seriesupdates/${created.id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // 确认已删除
    const listRes = await fetch(`${baseUrl}/api/seriesupdates`);
    const list = await listRes.json();
    expect(list.find((t: { id: string }) => t.id === created.id)).toBeUndefined();
  });

  it('DELETE /api/seriesupdates/:id with nonexistent id returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/seriesupdates/nonexistent-id`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });

  it('GET /api/seriesupdates?search filters results', async () => {
    // 创建两条不同名称的记录
    await fetch(`${baseUrl}/api/seriesupdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '进击的巨人', SERIES_ID: 'aot' }),
    });
    await fetch(`${baseUrl}/api/seriesupdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '鬼灭之刃', SERIES_ID: 'kny' }),
    });

    const res = await fetch(`${baseUrl}/api/seriesupdates?search=${encodeURIComponent('巨人')}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('进击的巨人');
  });

  it('GET /api/seriesupdates?search matches SERIES_ID', async () => {
    await fetch(`${baseUrl}/api/seriesupdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '测试A', SERIES_ID: 'unique-xyz' }),
    });
    await fetch(`${baseUrl}/api/seriesupdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '测试B', SERIES_ID: 'other' }),
    });

    const res = await fetch(
      `${baseUrl}/api/seriesupdates?search=${encodeURIComponent('unique-xyz')}`,
    );
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].SERIES_ID).toBe('unique-xyz');
  });
});
