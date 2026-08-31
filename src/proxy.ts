import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedToken } from './lib/auth/token';

const ROUTES = {
  ADMIN: {
    prefix: ['/admin', '/api/generic', '/api/admin'], // 優先級高的路徑
    login: '/admin/login',
    home: '/admin',
    cookie: 'admin',
    requiredRole: 'admin',
  },
  USER: {
    prefix: ['/account', '/api'], // 包含廣泛的 /api
    login: '/login',
    home: '/account',
    cookie: 'user',
    requiredRole: 'user',
  },
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 定義要排除的路徑 (不需要驗證的公開路徑)
  const isPublicRoute = ['/api/user/register', '/api/user/login', '/api/admin/login'].includes(pathname);
  if (isPublicRoute) return NextResponse.next();

  const isAdminRoute = ROUTES.ADMIN.prefix.some((prefix) => pathname.startsWith(prefix));
  const isUserRoute =
    ROUTES.USER.prefix.some((prefix) => pathname.startsWith(prefix)) || pathname === ROUTES.USER.login;

  const config = isAdminRoute ? ROUTES.ADMIN : isUserRoute ? ROUTES.USER : null;
  if (!config) return NextResponse.next();

  const accessToken = req.cookies.get(`${config.cookie}_access_token`)?.value;
  const refreshToken = req.cookies.get(`${config.cookie}_refresh_token`)?.value;
  const isLoginPage = pathname === config.login;
  const isApiRequest = pathname.startsWith('/api');

  const verifiedTokenResult = await getVerifiedToken(accessToken, refreshToken);
  if (verifiedTokenResult) {
    const userId = verifiedTokenResult.payload.sub! as string;
    const userRole = verifiedTokenResult.payload.role as string;

    if (userRole !== config.requiredRole) {
      // 角色不符：可以導向 403 頁面，或者根據角色導向他們該去的地方
      if (isApiRequest) {
        return NextResponse.json({ message: 'Forbidden: Insufficient permissions' }, { status: 403 });
      }
      const fallbackUrl = userRole === 'admin' ? ROUTES.ADMIN.home : ROUTES.USER.home;
      return NextResponse.redirect(new URL(fallbackUrl, req.url));
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', userId);
    requestHeaders.set('x-user-role', userRole);

    const response = isLoginPage
      ? NextResponse.redirect(new URL(config.home, req.url))
      : NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });

    if (verifiedTokenResult.newAccessToken) {
      response.cookies.set(`${config.cookie}_access_token`, verifiedTokenResult.newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      });
    }

    return response;
  }

  if (!isLoginPage) {
    if (isApiRequest) {
      // API 請求回傳 401，不要 Redirect
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL(config.login, req.url));
    response.cookies.delete(`${config.cookie}_access_token`);
    response.cookies.delete(`${config.cookie}_refresh_token`);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/api/:path*', '/login'],
};
