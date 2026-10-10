import * as jose from 'jose';
import { GraphQLError } from 'graphql';

const JWT_SECRET = process.env.JWT_SECRET || 'a super secret temporary value';
const JWT_EXPIRY = '7d';

const secret = new TextEncoder().encode(JWT_SECRET);

export type TokenClaims = {
  username: string;
  sub: string;
};

export const signToken = async (payload: TokenClaims): Promise<string> => {
  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);

  return token;
};

export const verifyToken = async (token: string): Promise<Viewer> => {
  const { payload } = await jose.jwtVerify<TokenClaims>(token, secret, {
    algorithms: ['HS256'],
  });

  return { id: payload.sub };
};

export type Viewer = { id: string };

// No header means an anonymous request. A header that doesn't verify fails the whole request (ADR 0004).
export const viewerFromAuthHeader = async (header: string | undefined): Promise<Viewer | null> => {
  if (!header) return null;

  try {
    return await verifyToken(header.replace(/^Bearer /, ''));
  } catch {
    throw new GraphQLError('The token is invalid or has expired.', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  }
};
