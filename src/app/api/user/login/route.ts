import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import { LoginSchema } from '@/models/schemas/user';
import { z } from 'zod';
import { setAuthCookies } from '@/lib/auth/cookies';

/**
 * @openapi
 * /api/user/login:
 *  post:
 *    tags:
 *      - User
 *    summary: 會員登入
 *    description: 前台會員登入，寫入 user access/refresh token 到 cookie。
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - username
 *              - password
 *            properties:
 *              username:
 *                type: string
 *                example: user01
 *              password:
 *                type: string
 *                example: user123
 *    responses:
 *      200:
 *        description: 登入成功
 *        content:
 *          application/json:
 *            example:
 *              message: 登入成功
 *      400:
 *        description: 資料格式錯誤
 *        content:
 *          application/json:
 *            example:
 *              message: 資料格式錯誤
 *              errors:
 *                password:
 *                  - 密碼至少需要 6 個字元
 *      401:
 *        description: 帳號或密碼錯誤
 *        content:
 *          application/json:
 *            example:
 *              message: 帳號或密碼錯誤
 *      500:
 *        description: 伺服器發生錯誤
 *        content:
 *          application/json:
 *            example:
 *              message: 伺服器發生錯誤
 *              error: 未知錯誤
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = LoginSchema.parse(body);

    await dbConnect();

    const user = await User.findOne({ username: validatedData.username }).select('+password');

    if (!user || !(await user.comparePassword(validatedData.password))) {
      return NextResponse.json({ message: '帳號或密碼錯誤' }, { status: 401 });
    }

    const accessToken = user.createAccessToken();
    const refreshToken = user.createRefreshToken();
    const response = NextResponse.json(
      {
        message: '登入成功',
      },
      { status: 200 },
    );

    setAuthCookies(response, { accessToken, refreshToken }, 'user');

    return response;
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const fieldErrors = err.flatten().fieldErrors;

      return NextResponse.json(
        {
          message: '資料格式錯誤',
          errors: fieldErrors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
