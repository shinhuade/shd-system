import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/user';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';
import { z } from 'zod';
import { getAuthSession } from '@/lib/auth/server';
import { profileUpdateSchema } from '@/models/schemas/user';

/**
 * @openapi
 * /api/user/profile:
 *  get:
 *    tags:
 *      - User
 *    summary: 取得會員資料
 *    description: 取得目前登入會員的個人資料。
 *    responses:
 *      200:
 *        description: 取得成功
 *        content:
 *          application/json:
 *            example:
 *              message: success
 *              data:
 *                _id: 6646df7f3a26f0bc00112233
 *                username: user01
 *                name: 王小明
 *                email: user@example.com
 *                avatar: https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg
 *      401:
 *        description: 未授權或登入資訊不完整
 *      404:
 *        description: 查無使用者
 *      500:
 *        description: 伺服器發生錯誤
 *  patch:
 *    tags:
 *      - User
 *    summary: 更新會員資料
 *    description: 更新目前登入會員資料，支援 JSON 或 multipart/form-data（avatar 上傳/清空）。
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              name:
 *                type: string
 *                example: 王小明
 *              email:
 *                type: string
 *                format: email
 *                example: user@example.com
 *              avatar:
 *                type: string
 *                example: https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            properties:
 *              name:
 *                type: string
 *              email:
 *                type: string
 *                format: email
 *              avatar:
 *                type: string
 *                format: binary
 *    responses:
 *      200:
 *        description: 更新成功
 *        content:
 *          application/json:
 *            example:
 *              message: success
 *              data:
 *                _id: 6646df7f3a26f0bc00112233
 *                name: 王小明
 *                email: user@example.com
 *      400:
 *        description: 資料格式錯誤
 *      401:
 *        description: 未授權或登入資訊不完整
 *      404:
 *        description: 查無使用者
 *      409:
 *        description: 信箱已被使用
 *      500:
 *        description: 伺服器發生錯誤
 */

export async function GET() {
  try {
    const auth = await getAuthSession();
    if (!auth.isValid) return auth.response;

    const { userId } = auth;
    if (!userId) return NextResponse.json({ message: '登入資訊不完整' }, { status: 401 });

    await dbConnect();

    const user = await User.findById(userId).lean();
    if (!user) return NextResponse.json({ message: '查無使用者' }, { status: 404 });

    return NextResponse.json({ message: 'success', data: user });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthSession();
    if (!auth.isValid) return auth.response;

    const { userId } = auth;
    if (!userId) return NextResponse.json({ message: '登入資訊不完整' }, { status: 401 });

    await dbConnect();

    const oldUser = await User.findById(userId).select('_id email avatar');
    if (!oldUser) return NextResponse.json({ message: '查無使用者' }, { status: 404 });

    const contentType = req.headers.get('content-type') || '';
    let updateData: Record<string, unknown> = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      for (const [key, value] of Array.from(formData.entries())) {
        if (key === 'avatar' && value instanceof File && value.size > 0) {
          if (oldUser.avatar) {
            await deleteFromCloudinary(oldUser.avatar);
          }
          const uploadRes = await uploadToCloudinary(value, 'user');
          updateData.avatar = uploadRes.secure_url;
          continue;
        }

        if (typeof value === 'string') {
          if (key === 'avatar' && value === '') {
            if (oldUser.avatar) {
              await deleteFromCloudinary(oldUser.avatar);
            }
            updateData.avatar = '';
            continue;
          }

          updateData[key] = value;
        }
      }
    } else {
      updateData = (await req.json()) as Record<string, unknown>;

      if (updateData.avatar === '' && oldUser.avatar) {
        await deleteFromCloudinary(oldUser.avatar);
      }
    }

    const validatedData = profileUpdateSchema.parse(updateData);

    if (validatedData.email && validatedData.email !== oldUser.email) {
      const existingEmail = await User.findOne({ email: validatedData.email, _id: { $ne: userId } }).select('_id');
      if (existingEmail) {
        return NextResponse.json(
          {
            message: '資料格式錯誤',
            errors: {
              email: ['信箱已被使用'],
            },
          },
          { status: 409 },
        );
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, validatedData, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();

    return NextResponse.json({ message: 'success', data: updatedUser });
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
