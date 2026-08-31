import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { modelMap } from '@/lib/model-map';
import { validateAdmin } from '@/lib/auth/server';

/**
 * @openapi
 * /api/generic/{collection}/all:
 *  get:
 *    tags:
 *      - Generic
 *    summary: 取得指定集合全部資料
 *    description: 後台通用查詢 API，不分頁回傳完整列表，可搭配 sort 參數。
 *    parameters:
 *      - in: path
 *        name: collection
 *        required: true
 *        schema:
 *          type: string
 *      - in: query
 *        name: sort
 *        schema:
 *          type: string
 *          default: -createdAt
 *    responses:
 *      200:
 *        description: 查詢成功
 *      401:
 *        description: 未授權
 *      404:
 *        description: 指定資源不存在
 *      500:
 *        description: 伺服器發生錯誤
 */
export async function GET(req: Request, { params }: { params: Promise<{ collection: string }> }) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { collection } = await params;
    const Model = modelMap[collection];

    if (!Model) return NextResponse.json({ message: `資源 '${collection}' 不存在` }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const sort = searchParams.get('sort') || '-createdAt';

    await dbConnect();

    const data = await Model.find({}).sort(sort).lean();

    return NextResponse.json({ message: 'success', total: data.length, data });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
