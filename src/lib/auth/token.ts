import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '');
const ACCESS_EXPIRE = process.env.ACCESS_EXPIRE || '15m';

export type VerifiedTokenResult = {
  payload: JWTPayload;
  newAccessToken?: string;
};

export async function getVerifiedToken(
  accessToken: string | undefined,
  refreshToken: string | undefined,
): Promise<VerifiedTokenResult | null> {
  if (!accessToken && !refreshToken) return null;

  try {
    if (!accessToken) {
      throw new Error('missing access token');
    }

    const { payload } = await jwtVerify(accessToken, JWT_SECRET);
    return { payload };
  } catch {
    if (refreshToken) {
      try {
        const { payload: refreshPayload } = await jwtVerify(refreshToken, JWT_SECRET);
        const sub = refreshPayload.sub;
        const role = refreshPayload.role;

        if (!sub || typeof role !== 'string') {
          return null;
        }

        const newAccessToken = await new SignJWT({ role })
          .setProtectedHeader({ alg: 'HS256' })
          .setSubject(sub)
          .setIssuedAt()
          .setExpirationTime(ACCESS_EXPIRE)
          .sign(JWT_SECRET);

        return {
          payload: { sub, role },
          newAccessToken,
        };
      } catch {
        return null;
      }
    }

    return null;
  }
}
