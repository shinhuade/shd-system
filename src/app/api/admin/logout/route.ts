import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/cookies';

/**
 * @openapi
 * /api/admin/logout:
 *  post:
 *    tags:
 *      - Admin
 *    summary: 管理員登出
 *    description: 清除管理員 access/refresh token cookies。
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
  clearAuthCookies(response, 'admin');

  return response;
}
