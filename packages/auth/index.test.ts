import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeJwt, SignJWT } from 'jose';
import { signToken, verifyToken, viewerFromAuthHeader } from './index.js';

const TEST_SECRET = vi.hoisted(() => (process.env.JWT_SECRET = 'test secret'));

const DAY_SECONDS = 24 * 60 * 60;

afterEach(() => {
  vi.useRealTimers();
});

describe('signToken', () => {
  it('puts the User id in sub and expires 7 days after iat', async () => {
    const token = await signToken({ sub: 'user-1', username: 'ada' });

    const claims = decodeJwt(token);
    expect(claims.sub).toBe('user-1');
    expect(claims.iat).toEqual(expect.any(Number));
    expect(claims.exp! - claims.iat!).toBe(7 * DAY_SECONDS);
  });
});

describe('verifyToken', () => {
  it('returns the Viewer whose id is the sub of a token it signed', async () => {
    const token = await signToken({ sub: 'user-1', username: 'ada' });

    await expect(verifyToken(token)).resolves.toEqual({ id: 'user-1' });
  });

  it('rejects an expired token', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = await signToken({ sub: 'user-1', username: 'ada' });

    vi.setSystemTime(new Date('2026-01-09T00:00:00Z'));

    await expect(verifyToken(token)).rejects.toMatchObject({ code: 'ERR_JWT_EXPIRED' });
  });

  it('accepts a token just before it expires', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = await signToken({ sub: 'user-1', username: 'ada' });

    vi.setSystemTime(new Date('2026-01-07T23:59:00Z'));

    await expect(verifyToken(token)).resolves.toEqual({ id: 'user-1' });
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await new SignJWT({ username: 'ada' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode('some other secret'));

    await expect(verifyToken(token)).rejects.toMatchObject({
      code: 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
    });
  });

  it('rejects a token signed with an algorithm other than HS256', async () => {
    const token = await new SignJWT({ username: 'ada' })
      .setProtectedHeader({ alg: 'HS384' })
      .setSubject('user-1')
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(TEST_SECRET));

    await expect(verifyToken(token)).rejects.toMatchObject({ code: 'ERR_JOSE_ALG_NOT_ALLOWED' });
  });

  it('rejects a token whose payload was tampered with', async () => {
    const token = await signToken({ sub: 'user-1', username: 'ada' });
    const [header, , signature] = token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ ...decodeJwt(token), sub: 'user-2' }),
    ).toString('base64url');

    await expect(verifyToken(`${header}.${forgedPayload}.${signature}`)).rejects.toMatchObject({
      code: 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
    });
  });

  it('rejects a string that is not a JWT', async () => {
    await expect(verifyToken('not-a-token')).rejects.toThrow();
  });
});

describe('viewerFromAuthHeader', () => {
  it('returns null when there is no header', async () => {
    await expect(viewerFromAuthHeader(undefined)).resolves.toBeNull();
    await expect(viewerFromAuthHeader('')).resolves.toBeNull();
  });

  it('returns the Viewer for a valid Bearer token', async () => {
    const token = await signToken({ sub: 'user-1', username: 'ada' });

    await expect(viewerFromAuthHeader(`Bearer ${token}`)).resolves.toEqual({ id: 'user-1' });
  });

  it('fails with UNAUTHENTICATED and a 401 for a token that does not verify', async () => {
    await expect(viewerFromAuthHeader('Bearer not-a-jwt')).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  });
});
