import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/cookies';

/**
 * @openapi
 * /api/user/logout:
 *  post:
 *    tags:
 *      - User
 *    summary: 會員登出
 *    description: 清除會員 access/refresh token cookies。
 *    responses:
 *      200:
 *        description: 登出成功
 *        content:
 *          application/json:
 *            example:
 *              success: true
 *              message: 登出成功
 */

export async function POST() {
  const response = NextResponse.json({ success: true, message: '登出成功' }, { status: 200 });
  clearAuthCookies(response, 'user');

  return response;
}
