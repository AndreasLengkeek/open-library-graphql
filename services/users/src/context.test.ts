import { afterEach, describe, expect, it, vi } from 'vitest';
import { signToken } from '@olg/auth';
import { createDb } from './db/index.js';
import { createContext } from './context.js';

const context = createContext(createDb(':memory:'));

const withHeaders = (headers: Record<string, string>) => context({ req: { headers } });

afterEach(() => {
  vi.useRealTimers();
});

describe('createContext', () => {
  it('has no Viewer when there is no Authorization header', async () => {
    const { viewer } = await withHeaders({});

    expect(viewer).toBeNull();
  });

  it('builds the Viewer from a valid Bearer token', async () => {
    const token = await signToken({ sub: 'user-1', username: 'ada' });

    const { viewer } = await withHeaders({ authorization: `Bearer ${token}` });

    expect(viewer).toEqual({ id: 'user-1' });
  });

  it('fails with UNAUTHENTICATED for a malformed token', async () => {
    await expect(withHeaders({ authorization: 'Bearer not-a-jwt' })).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it('fails with UNAUTHENTICATED for an expired token', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = await signToken({ sub: 'user-1', username: 'ada' });
    vi.setSystemTime(new Date('2026-01-09T00:00:00Z'));

    await expect(withHeaders({ authorization: `Bearer ${token}` })).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it('ignores identity headers other than Authorization', async () => {
    const { viewer } = await withHeaders({ 'x-user-id': 'user-1' });

    expect(viewer).toBeNull();
  });
});
