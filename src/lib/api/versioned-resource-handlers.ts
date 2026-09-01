import { NextRequest, NextResponse } from 'next/server';
import { Model } from 'mongoose';
import { ZodError, ZodType } from 'zod';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import { addVersion, listHistory } from '@/lib/pricing/versioning';

/**
 * 「主檔目前值快取 + 獨立 History 集合」這套版本化資料型態，在粉料/包材/水電瓦斯/
 * 人工/固定成本五組主資料上是完全相同的 CRUD 樣式，這裡集中實作一次，
 * 各資源的 route.ts 只需傳入自己的 Model/zod schema 組成 handler。
 */

function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json({ message: '資料格式錯誤', errors: err.flatten().fieldErrors }, { status: 400 });
  }
  return NextResponse.json(
    { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
    { status: 500 },
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = Model<any>;

/** GET(list) / POST(create) 主檔本身（不含價格，價格一律透過 price-history 端點新增版本） */
export function createBaseResourceHandlers(ParentModel: AnyModel, createSchema: ZodType) {
  async function GET() {
    try {
      const auth = await validateAdmin();
      if (!auth.isValid) return auth.response;

      await dbConnect();
      const data = await ParentModel.find().sort('-createdAt').lean();
      return NextResponse.json({ message: 'success', data });
    } catch (err) {
      return handleError(err);
    }
  }

  async function POST(req: NextRequest) {
    try {
      const auth = await validateAdmin();
      if (!auth.isValid) return auth.response;

      const body = (await req.json()) as Record<string, unknown>;
      const validated = createSchema.parse(body) as Record<string, unknown>;

      await dbConnect();
      const data = await ParentModel.create(validated);
      return NextResponse.json({ message: 'success', data }, { status: 201 });
    } catch (err) {
      return handleError(err);
    }
  }

  return { GET, POST };
}

/** GET(單筆) / PATCH(僅限基本欄位) / DELETE，protectedFields 會被禁止透過此端點修改 */
export function createBaseItemHandlers(ParentModel: AnyModel, protectedFields: string[] = []) {
  async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const auth = await validateAdmin();
      if (!auth.isValid) return auth.response;

      const { id } = await params;
      await dbConnect();
      const data = await ParentModel.findById(id).lean();
      if (!data) return NextResponse.json({ message: '找不到資料' }, { status: 404 });
      return NextResponse.json({ message: 'success', data });
    } catch (err) {
      return handleError(err);
    }
  }

  async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const auth = await validateAdmin();
      if (!auth.isValid) return auth.response;

      const { id } = await params;
      const body = (await req.json()) as Record<string, unknown>;
      for (const field of protectedFields) delete body[field];

      await dbConnect();
      const data = await ParentModel.findByIdAndUpdate(id, body, { new: true, runValidators: true });
      if (!data) return NextResponse.json({ message: '找不到資料' }, { status: 404 });
      return NextResponse.json({ message: 'success', data });
    } catch (err) {
      return handleError(err);
    }
  }

  async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const auth = await validateAdmin();
      if (!auth.isValid) return auth.response;

      const { id } = await params;
      await dbConnect();
      const data = await ParentModel.findByIdAndDelete(id);
      if (!data) return NextResponse.json({ message: '找不到資料' }, { status: 404 });
      return NextResponse.json({ message: 'success' });
    } catch (err) {
      return handleError(err);
    }
  }

  return { GET, PATCH, DELETE };
}

export interface PriceHistoryHandlerOptions {
  ParentModel: AnyModel;
  HistoryModel: AnyModel;
  /** History 文件上指回主檔的欄位名稱，例如 'materialId' */
  parentIdField: string;
  /** 新增版本時的 zod schema（含 parentId 欄位） */
  historySchema: ZodType;
  /** History 欄位 -> 主檔快取欄位 對應，例如 { pricePerKg: 'currentPricePerKg' } */
  cacheFieldMap: Record<string, string>;
}

/** GET(歷史列表) / POST(新增版本，同步更新主檔快取) */
export function createPriceHistoryHandlers({
  ParentModel,
  HistoryModel,
  parentIdField,
  historySchema,
  cacheFieldMap,
}: PriceHistoryHandlerOptions) {
  async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const auth = await validateAdmin();
      if (!auth.isValid) return auth.response;

      const { id } = await params;
      await dbConnect();
      const data = await listHistory(HistoryModel, parentIdField, id);
      return NextResponse.json({ message: 'success', data });
    } catch (err) {
      return handleError(err);
    }
  }

  async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const auth = await validateAdmin();
      if (!auth.isValid) return auth.response;

      const { id } = await params;
      const body = (await req.json()) as Record<string, unknown>;
      const validated = historySchema.parse({ ...body, [parentIdField]: id }) as Record<string, unknown> & {
        effectiveDate: Date;
      };

      await dbConnect();
      const result = await addVersion({
        ParentModel,
        HistoryModel,
        parentIdField,
        parentId: id,
        historyData: validated,
        cacheFieldMap,
      });

      return NextResponse.json({ message: 'success', data: result.history }, { status: 201 });
    } catch (err) {
      return handleError(err);
    }
  }

  return { GET, POST };
}
