import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

  afterAll(() => {
    close();
  });

  it('GET /api/health returns ok', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('GET /api/todos returns array', async () => {
    const res = await fetch(`${baseUrl}/api/todos`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('POST /api/todos creates a todo', async () => {
    const res = await fetch(`${baseUrl}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test todo' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ title: 'Test todo', done: false });
    expect(body.id).toBeDefined();
  });

  it('POST /api/todos without title returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
