import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { modelMap } from '@/lib/model-map';
import { validateAdmin } from '@/lib/auth/server';

/**
 * @openapi
 * /api/generic/{collection}:
 *  get:
 *    tags:
 *      - Generic
 *    summary: 取得指定集合列表
 *    description: 後台通用列表查詢，支援 keyword、fields、分頁與排序。
 *    parameters:
 *      - in: path
 *        name: collection
 *        required: true
 *        schema:
 *          type: string
 *        description: 集合名稱（例如 user、admin）
 *      - in: query
 *        name: keyword
 *        schema:
 *          type: string
 *        description: 搜尋關鍵字
 *      - in: query
 *        name: fields
 *        schema:
 *          type: string
 *          example: name,email
 *        description: 要搜尋的欄位，以逗號分隔
 *      - in: query
 *        name: page
 *        schema:
 *          type: integer
 *          default: 1
 *      - in: query
 *        name: limit
 *        schema:
 *          type: integer
 *          default: 10
 *      - in: query
 *        name: sort
 *        schema:
 *          type: string
 *          default: -createdAt
 *    responses:
 *      200:
 *        description: 查詢成功
 *        content:
 *          application/json:
 *            example:
 *              message: success
 *              total: 1
 *              data:
 *                - _id: 6646df7f3a26f0bc00112233
 *      401:
 *        description: 未授權
 *      404:
 *        description: 指定資源不存在
 *      500:
 *        description: 伺服器發生錯誤
 */

export const buildSearchQuery = (keyword: string | null | undefined, fields: string | string[] | null | undefined) => {
  // 1. 基本檢查：若無關鍵字或欄位則回傳空查詢
  if (!keyword || !fields) return {};

  // 2. 處理 fields 型別，確保最終為 string[]
  const searchFields: string[] = Array.isArray(fields)
    ? fields
    : fields
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);

  // 3. 如果處理後欄位陣列為空，回傳空查詢
  if (searchFields.length === 0) return {};

  // 4. 構建 $or 查詢
  return {
    $or: searchFields.map((field) => ({
      [field]: { $regex: keyword, $options: 'i' },
    })),
  };
};

/**
 * 依單一欄位做等值篩選（例如客戶／廠商主檔的 isCustomer=true）。
 *
 * filterField 一律先比對該 Model 真正存在的 schema 路徑，不存在就整個忽略：
 * 查詢字串是使用者可控的輸入，若原封不動丟進 find()，等於讓任何人針對任意欄位
 * 下條件、甚至塞入查詢運算子。只允許已定義的欄位、且只做等值比對。
 *
 * 值一律以字串傳入，因此依欄位型別轉換：布林欄位收 'true'/'false'，數字欄位轉數字，
 * 其餘維持字串。轉不出來就忽略這個條件，不會退化成把字串拿去比對布林欄位。
 */
export const buildFilterQuery = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Model: any,
  filterField: string | null | undefined,
  filterValue: string | null | undefined,
) => {
  if (!filterField || filterValue == null || filterValue === '') return {};

  // 必須用 hasOwnProperty 檢查：paths['__proto__'] 會取到 Object 原型而非真正的欄位，
  // 直接看真假值會讓 __proto__ 這類鍵通過檢查並被塞進查詢條件。
  const paths = Model?.schema?.paths;
  if (!paths || !Object.prototype.hasOwnProperty.call(paths, filterField)) return {};

  const path = paths[filterField];
  const instance = path?.instance;
  if (instance === 'Boolean') {
    if (filterValue !== 'true' && filterValue !== 'false') return {};
    return { [filterField]: filterValue === 'true' };
  }
  if (instance === 'Number') {
    const num = Number(filterValue);
    return Number.isFinite(num) ? { [filterField]: num } : {};
  }
  return { [filterField]: filterValue };
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ collection: string }> }) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { collection } = await params;

    const Model = modelMap[collection];
    if (!Model) {
      return NextResponse.json({ message: `資源 '${collection}' 不存在` }, { status: 404 });
    }

    const { searchParams } = new URL(req.nextUrl);
    const query = Object.fromEntries(searchParams.entries());
    const { keyword, fields, filterField, filterValue, page = 1, limit = 10, sort = '-createdAt' } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const finalQuery = {
      ...buildSearchQuery(keyword, fields),
      ...buildFilterQuery(Model, filterField, filterValue),
    };

    await dbConnect();

    const [data, total] = await Promise.all([
      Model.find(finalQuery).sort(sort).skip(skip).limit(Number(limit)).lean(),
      Model.countDocuments(finalQuery),
    ]);

    return NextResponse.json({ message: 'success', total, data });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
