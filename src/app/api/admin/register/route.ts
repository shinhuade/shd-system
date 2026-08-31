import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Admin from '@/models/admin';
import { AdminSchema } from '@/models/schemas/admin';
import { z } from 'zod';

/**
 * @openapi
 * /api/admin/register:
 *  post:
 *    tags:
 *      - Admin
 *    summary: 管理員註冊
 *    description: 建立後台管理員帳號。
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
 *                example: admin
 *              password:
 *                type: string
 *                example: admin123
 *    responses:
 *      201:
 *        description: 註冊成功
 *        content:
 *          application/json:
 *            example:
 *              message: 註冊成功
 *      400:
 *        description: 資料格式錯誤
 *        content:
 *          application/json:
 *            example:
 *              message: 資料格式錯誤
 *              errors:
 *                username:
 *                  - 帳號至少需要 3 個字元
 *      409:
 *        description: 帳號已存在
 *        content:
 *          application/json:
 *            example:
 *              message: 帳號已存在
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
    const validatedData = AdminSchema.parse(body);

    await dbConnect();

    const existingAdmin = await Admin.findOne({ username: validatedData.username });
    if (existingAdmin) {
      return NextResponse.json({ message: '帳號已存在' }, { status: 409 });
    }

    await Admin.create(validatedData);
    return NextResponse.json({ message: '註冊成功' }, { status: 201 });
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
