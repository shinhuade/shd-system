import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Admin from '@/models/admin';
import { validateAdmin } from '@/lib/auth/server';
import { z } from 'zod';
import { passwordUpdateSchema } from '@/models/schemas/admin';

/**
 * @openapi
 * /api/admin/password:
 *  patch:
 *    tags:
 *      - Admin
 *    summary: 管理員更新密碼
 *    description: 管理員登入後更新目前帳號密碼。
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
 *                example: admin123
 *              newPassword:
 *                type: string
 *                example: admin456
 *              confirmPassword:
 *                type: string
 *                example: admin456
 *    responses:
 *      200:
 *        description: 密碼更新成功
 *        content:
 *          application/json:
 *            example:
 *              message: 密碼更新成功
 *      400:
 *        description: 資料格式錯誤或密碼不符合規則
 *        content:
 *          application/json:
 *            example:
 *              message: 資料格式錯誤
 *              errors:
 *                currentPassword:
 *                  - 目前密碼不正確
 *      401:
 *        description: 未授權
 *      404:
 *        description: 查無使用者
 *        content:
 *          application/json:
 *            example:
 *              message: 查無使用者
 *      500:
 *        description: 伺服器發生錯誤
 *        content:
 *          application/json:
 *            example:
 *              message: 伺服器發生錯誤
 *              error: 未知錯誤
 */

export async function PATCH(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;
    const { userId } = auth;

    const body = (await req.json()) as Record<string, unknown>;
    const validatedData = passwordUpdateSchema.parse(body);

    await dbConnect();

    const admin = await Admin.findById(userId).select('+password');
    if (!admin) return NextResponse.json({ message: '查無使用者' }, { status: 404 });

    const isCurrentPasswordValid = await admin.comparePassword(validatedData.currentPassword);
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

    admin.password = validatedData.newPassword;
    await admin.save();

    return NextResponse.json({ message: '密碼更新成功' }, { status: 200 });
  } catch (err) {
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
