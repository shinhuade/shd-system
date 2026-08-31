import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { modelMap } from '@/lib/model-map';
import mongoose from 'mongoose';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary';
import { validateAdmin } from '@/lib/auth/server';

/**
 * @openapi
 * /api/generic/{collection}/{id}:
 *  get:
 *    tags:
 *      - Generic
 *    summary: 取得單筆資料
 *    description: 後台通用單筆查詢 API。
 *    parameters:
 *      - in: path
 *        name: collection
 *        required: true
 *        schema:
 *          type: string
 *      - in: path
 *        name: id
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      200:
 *        description: 查詢成功
 *      400:
 *        description: 無效 ID 或查無資料
 *      401:
 *        description: 未授權
 *      404:
 *        description: 指定資源不存在
 *      500:
 *        description: 伺服器發生錯誤
 *  patch:
 *    tags:
 *      - Generic
 *    summary: 更新單筆資料
 *    description: 後台通用更新 API，支援 JSON 與 multipart/form-data，並處理 Cloudinary 舊檔刪除。
 *    parameters:
 *      - in: path
 *        name: collection
 *        required: true
 *        schema:
 *          type: string
 *      - in: path
 *        name: id
 *        required: true
 *        schema:
 *          type: string
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
 *      200:
 *        description: 更新成功
 *      400:
 *        description: 無效 ID 或查無資料
 *      401:
 *        description: 未授權
 *      404:
 *        description: 指定資源不存在
 *      500:
 *        description: 伺服器發生錯誤
 *  delete:
 *    tags:
 *      - Generic
 *    summary: 刪除單筆資料
 *    description: 後台通用刪除 API，會遞迴掃描資料內 Cloudinary URL 並嘗試刪除檔案。
 *    parameters:
 *      - in: path
 *        name: collection
 *        required: true
 *        schema:
 *          type: string
 *      - in: path
 *        name: id
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      200:
 *        description: 刪除成功
 *      400:
 *        description: 無效 ID
 *      401:
 *        description: 未授權
 *      404:
 *        description: 指定資源不存在或刪除失敗
 *      500:
 *        description: 伺服器發生錯誤
 */

export async function GET(req: NextRequest, { params }: { params: Promise<{ collection: string; id: string }> }) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { collection, id } = await params;

    const Model = modelMap[collection];

    if (!Model) return NextResponse.json({ message: `資源 '${collection}' 不存在` }, { status: 404 });
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ message: '無效的ID格式' }, { status: 400 });

    await dbConnect();

    const data = await Model.findById(id);
    if (!data) return NextResponse.json({ message: '查無資料' }, { status: 400 });

    return NextResponse.json({ message: 'success', data });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ collection: string; id: string }> }) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { collection, id } = await params;
    const contentType = req.headers.get('content-type') || '';

    let updateData: Record<string, unknown> = {};

    const Model = modelMap[collection];

    if (!Model) return NextResponse.json({ message: `資源 '${collection}' 不存在` }, { status: 404 });
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ message: '無效的ID格式' }, { status: 400 });

    await dbConnect();

    // 先取舊資料，供檔案替換與清空欄位時判斷是否需要刪 Cloudinary 圖片
    const oldDoc = (await Model.findById(id).lean()) as Record<string, unknown> | null;
    if (!oldDoc) return NextResponse.json({ message: '查無資料' }, { status: 400 });

    // 判斷是傳送檔案 (FormData) 還是純資料 (JSON)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      for (const [key, value] of Array.from(formData.entries())) {
        if (value instanceof File && value.size > 0) {
          // 1. 刪除舊檔：直接呼叫封裝好的函式，傳入舊的 URL
          const oldValue = oldDoc?.[key];
          if (typeof oldValue === 'string' && oldValue) {
            await deleteFromCloudinary(oldValue);
          }

          // 2. 上傳新檔
          const uploadRes = await uploadToCloudinary(value, collection);
          updateData[key] = uploadRes.secure_url;

          console.log(`已更換檔案: ${key}`);
        } else if (typeof value === 'string' && key !== 'fileKey') {
          if (value === '') {
            const oldValue = oldDoc[key];
            if (typeof oldValue === 'string' && oldValue) {
              await deleteFromCloudinary(oldValue);
            }
          }
          updateData[key] = value;
        }
      }
    } else {
      updateData = (await req.json()) as Record<string, unknown>;

      for (const [key, value] of Object.entries(updateData)) {
        if (value === '') {
          const oldValue = oldDoc[key];
          if (typeof oldValue === 'string' && oldValue) {
            await deleteFromCloudinary(oldValue);
          }
        }
      }
    }

    const result = await Model.findByIdAndUpdate(id, updateData, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!result) return NextResponse.json({ message: '查無資料' }, { status: 400 });

    return NextResponse.json({ message: 'success', data: result });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ collection: string; id: string }> }) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { collection, id } = await params;

    const Model = modelMap[collection];

    if (!Model) return NextResponse.json({ message: `資源 '${collection}' 不存在` }, { status: 404 });
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ message: '無效的ID格式' }, { status: 400 });

    await dbConnect();

    const data = (await Model.findById(id).lean()) as Record<string, unknown> | null;
    if (!data) return NextResponse.json({ message: '刪除失敗' }, { status: 404 });

    const cloudinaryUrls = new Set<string>();
    const collectCloudinaryUrls = (value: unknown) => {
      if (typeof value === 'string') {
        if (value.includes('cloudinary')) {
          cloudinaryUrls.add(value);
        }
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(collectCloudinaryUrls);
        return;
      }

      if (typeof value === 'object' && value !== null) {
        Object.values(value as Record<string, unknown>).forEach(collectCloudinaryUrls);
      }
    };

    collectCloudinaryUrls(data);

    if (cloudinaryUrls.size > 0) {
      await Promise.allSettled(Array.from(cloudinaryUrls).map((url) => deleteFromCloudinary(url)));
    }

    await Model.findByIdAndDelete(id);

    return NextResponse.json({ message: 'success' });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
