import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth/server';
import { passwordUpdateSchema } from '@/models/schemas/user';

/**
 * @openapi
 * /api/user/password:
 *  patch:
 *    tags:
 *      - User
 *    summary: 會員更新密碼
 *    description: 會員登入後更新目前帳號密碼。
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - currentPassword
 *              - newPassword
 *              - confirmPassword
 *            properties:
 *              currentPassword:
 *                type: string
 *                example: user123
 *              newPassword:
 *                type: string
 *                example: user456
 *              confirmPassword:
 *                type: string
 *                example: user456
 *    responses:
 *      200:
 *        description: 密碼更新成功
 *        content:
 *          application/json:
 *            example:
 *              message: 密碼更新成功
 *      400:
 *        description: 資料格式錯誤或密碼不符合規則
 *      401:
 *        description: 未授權或登入資訊不完整
 *      404:
 *        description: 查無使用者
 *      500:
 *        description: 伺服器發生錯誤
 */

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthSession();
    if (!auth.isValid) return auth.response;

    const { userId } = auth;
    if (!userId) return NextResponse.json({ message: '登入資訊不完整' }, { status: 401 });

    const body = (await req.json()) as Record<string, unknown>;
    const validatedData = passwordUpdateSchema.parse(body);

    await dbConnect();

    const user = await User.findById(userId).select('+password');
    if (!user) return NextResponse.json({ message: '查無使用者' }, { status: 404 });

    const isCurrentPasswordValid = await user.comparePassword(validatedData.currentPassword);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        {
          message: '資料格式錯誤',
          errors: {
            currentPassword: ['目前密碼不正確'],
          },
        },
        { status: 400 },
      );
    }

    if (validatedData.currentPassword === validatedData.newPassword) {
      return NextResponse.json(
        {
          message: '資料格式錯誤',
          errors: {
            newPassword: ['新密碼不可與目前密碼相同'],
          },
        },
        { status: 400 },
      );
    }

    user.password = validatedData.newPassword;
    await user.save();

    return NextResponse.json({ message: '密碼更新成功' }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: '資料格式錯誤',
          errors: err.flatten().fieldErrors,
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
