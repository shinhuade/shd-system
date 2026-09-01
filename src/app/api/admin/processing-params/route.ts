import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import ProcessingCostParams from '@/models/processing-cost-params';
import { ProcessingCostParamsSchema } from '@/models/schemas/processing-cost-params';

function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json({ message: '資料格式錯誤', errors: err.flatten().fieldErrors }, { status: 400 });
  }
  return NextResponse.json(
    { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
    { status: 500 },
  );
}

/** GET：歷史版本列表（新到舊） */
export async function GET() {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    await dbConnect();
    const data = await ProcessingCostParams.find().sort('-effectiveDate').lean();
    return NextResponse.json({ message: 'success', data });
  } catch (err) {
    return handleError(err);
  }
}

/** POST：新增一筆加工成本參數版本（每一筆即一個版本，不覆蓋舊資料） */
export async function POST(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const body = (await req.json()) as Record<string, unknown>;
    const validated = ProcessingCostParamsSchema.parse(body);

    await dbConnect();
    const data = await ProcessingCostParams.create(validated);
    return NextResponse.json({ message: 'success', data }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
