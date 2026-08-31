import { NextResponse } from 'next/server';

type AuthRole = 'admin' | 'user';

interface JwtToken {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15m
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7d

const getCookieOptions = (maxAge?: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  ...(maxAge !== undefined && { maxAge }),
});

export function setAuthCookies(response: NextResponse, tokens: JwtToken, role: AuthRole) {
  response.cookies.set(`${role}_access_token`, tokens.accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
  response.cookies.set(`${role}_refresh_token`, tokens.refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));
  return response;
}

export function clearAuthCookies(response: NextResponse, role: AuthRole) {
  response.cookies.delete(`${role}_access_token`);
  response.cookies.delete(`${role}_refresh_token`);
  return response;
}
