import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { modelMap } from '@/lib/model-map';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { validateAdmin } from '@/lib/auth/server';

/**
 * @openapi
 * /api/generic/{collection}/create:
 *  post:
 *    tags:
 *      - Generic
 *    summary: 建立指定集合資料
 *    description: 後台通用建立 API，支援 JSON 與 multipart/form-data（檔案會上傳到 Cloudinary）。
 *    parameters:
 *      - in: path
 *        name: collection
 *        required: true
 *        schema:
 *          type: string
 *        description: 集合名稱（例如 user、admin）
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            additionalProperties: true
 *        multipart/form-data:
 *          schema:
 *            type: object
 *            additionalProperties: true
 *    responses:
 *      201:
 *        description: 建立成功
 *        content:
 *          application/json:
 *            example:
 *              message: success
 *              data:
 *                _id: 6646df7f3a26f0bc00112233
 *      401:
 *        description: 未授權
 *      404:
 *        description: 指定資源不存在
 *      500:
 *        description: 伺服器發生錯誤
 */

export async function POST(req: NextRequest, { params }: { params: Promise<{ collection: string }> }) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { collection } = await params;
    const contentType = req.headers.get('content-type') || '';

    const Model = modelMap[collection];
    if (!Model) return NextResponse.json({ message: `資源 '${collection}' 不存在` }, { status: 404 });

    let createData: Record<string, unknown> = {};

    await dbConnect();

    // 判斷是傳送檔案 (FormData) 還是純資料 (JSON)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      for (const [key, value] of Array.from(formData.entries())) {
        if (value instanceof File && value.size > 0) {
          const uploadRes = await uploadToCloudinary(value, collection);
          createData[key] = uploadRes.secure_url;
        } else if (typeof value === 'string' && key !== 'fileKey') {
          createData[key] = value;
        }
      }
    } else {
      createData = (await req.json()) as Record<string, unknown>;
    }

    const result = await Model.create(createData);

    return NextResponse.json({ message: 'success', data: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
