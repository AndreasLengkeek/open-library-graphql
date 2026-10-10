import type { AddressInfo } from 'net';
import { afterEach, describe, expect, it } from 'vitest';
import { createRequestCounter } from './datasources/openLibrary.js';
import { createDebugServer } from './debugServer.js';

const counter = createRequestCounter();
const server = createDebugServer(counter);

async function request(method: string, path: string) {
  if (!server.listening) await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${port}${path}`, { method });
}

afterEach(() => {
  counter.reset();
  server.close();
});

describe('the catalog debug server', () => {
  it('reports the Open Library requests counted so far', async () => {
    counter.increment();
    counter.increment();

    const res = await request('GET', '/open-library-requests');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: 2 });
  });

  it('resets the count on DELETE', async () => {
    counter.increment();

    const res = await request('DELETE', '/open-library-requests');

    expect(await res.json()).toEqual({ count: 0 });
    expect(counter.count).toBe(0);
  });

  it('answers 404 for anything else', async () => {
    const res = await request('GET', '/');

    expect(res.status).toBe(404);
  });
});
