import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import { UserSchema } from '@/models/schemas/user';
import { z } from 'zod';
import { uploadToCloudinary } from '@/lib/cloudinary';

/**
 * @openapi
 * /api/user/register:
 *  post:
 *    tags:
 *      - User
 *    summary: 會員註冊
 *    description: 建立會員帳號，支援 JSON 或 multipart/form-data（可含 avatar 檔案上傳）。
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - username
 *              - password
 *              - confirmPassword
 *              - name
 *              - email
 *            properties:
 *              username:
 *                type: string
 *                example: user01
 *              password:
 *                type: string
 *                example: user123
 *              confirmPassword:
 *                type: string
 *                example: user123
 *              name:
 *                type: string
 *                example: 王小明
 *              email:
 *                type: string
 *                format: email
 *                example: user@example.com
 *              avatar:
 *                type: string
 *                format: uri
 *                example: https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            required:
 *              - username
 *              - password
 *              - confirmPassword
 *              - name
 *              - email
 *            properties:
 *              username:
 *                type: string
 *              password:
 *                type: string
 *              confirmPassword:
 *                type: string
 *              name:
 *                type: string
 *              email:
 *                type: string
 *                format: email
 *              avatar:
 *                type: string
 *                format: binary
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
 *                email:
 *                  - Email 格式不正確
 *      409:
 *        description: 帳號或信箱已存在
 *        content:
 *          application/json:
 *            example:
 *              message: 資料格式錯誤
 *              errors:
 *                username:
 *                  - 帳號已存在
 *      500:
 *        description: 伺服器發生錯誤
 *        content:
 *          application/json:
 *            example:
 *              message: 伺服器發生錯誤
 *              error: 未知錯誤
 */

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let body: Record<string, unknown> = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      for (const [key, value] of Array.from(formData.entries())) {
        if (value instanceof File && value.size > 0) {
          const uploadRes = await uploadToCloudinary(value, 'user');
          body[key] = uploadRes.secure_url;
        } else if (typeof value === 'string') {
          body[key] = value;
        }
      }
    } else {
      body = (await req.json()) as Record<string, unknown>;
    }

    const validatedData = UserSchema.parse(body);

    await dbConnect();

    const [existingUser, existingEmail] = await Promise.all([
      User.findOne({ username: validatedData.username }),
      User.findOne({ email: validatedData.email }),
    ]);

    const duplicateErrors: Record<string, string[]> = {};
    if (existingUser) {
      duplicateErrors.username = ['帳號已存在'];
    }
    if (existingEmail) {
      duplicateErrors.email = ['信箱已被使用'];
    }

    if (Object.keys(duplicateErrors).length > 0) {
      return NextResponse.json(
        {
          message: '資料格式錯誤',
          errors: duplicateErrors,
        },
        { status: 409 },
      );
    }

    await User.create(validatedData);
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
