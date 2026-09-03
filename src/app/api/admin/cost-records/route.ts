import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import CostRecord from '@/models/cost-record';
import { COST_RECORD_CATEGORIES } from '@/models/schemas/cost-record';
import { z } from 'zod';

const UpsertCostRecordsSchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: '月份格式須為 YYYY-MM' }),
  entries: z
    .array(
      z.object({
        category: z.enum(COST_RECORD_CATEGORIES),
        amount: z.number().min(0),
      }),
    )
    .min(1),
});

/** GET：取得某月份 7 個類別的實際成本（缺的類別補 0） */
export async function GET(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { searchParams } = new URL(req.nextUrl);
    const periodMonth = searchParams.get('periodMonth');
    if (!periodMonth) return NextResponse.json({ message: '請提供 periodMonth' }, { status: 400 });

    await dbConnect();
    const records = await CostRecord.find({ periodMonth }).lean();
    const byCategory = new Map(records.map((r) => [r.category, r.amount]));

    const data = COST_RECORD_CATEGORIES.map((category) => ({
      category,
      amount: byCategory.get(category) ?? 0,
    }));

    return NextResponse.json({ message: 'success', data });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}

/** PUT：本月成本登錄，7 個類別金額 upsert（本身就是實際發生數，覆蓋式更新，不做版本歷史） */
export async function PUT(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const body = (await req.json()) as Record<string, unknown>;
    const { periodMonth, entries } = UpsertCostRecordsSchema.parse(body);

    await dbConnect();

    await Promise.all(
      entries.map((entry) =>
        CostRecord.findOneAndUpdate(
          { category: entry.category, periodMonth },
          { category: entry.category, periodMonth, amount: entry.amount, createdBy: auth.userId },
          { upsert: true, new: true },
        ),
      ),
    );

    return NextResponse.json({ message: 'success' });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ message: '資料格式錯誤', errors: err.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
