import * as jose from 'jose';

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

export const verifyToken = async (token: string): Promise<TokenClaims> => {
  const { payload } = await jose.jwtVerify<TokenClaims>(token, secret, {
    algorithms: ['HS256'],
  });

  return payload;
};
