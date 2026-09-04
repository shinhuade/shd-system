import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import CostRecord from '@/models/cost-record';
import { COST_RECORD_CATEGORIES, costCategoryKey, periodMonthField } from '@/models/schemas/cost-record';
import { z } from 'zod';

const UpsertCostRecordsSchema = z.object({
  periodMonth: periodMonthField,
  entries: z
    .array(
      z.object({
        // 類別不限內建清單：使用者可在「每月成本紀錄」新增自訂成本項目（label 為顯示名稱）
        category: costCategoryKey,
        label: z.string().trim().max(60).optional(),
        amount: z.number().min(0),
      }),
    )
    .min(1),
  /** 是否刪除本月未出現在 entries 中的類別（用於使用者移除自訂項目） */
  replaceMissing: z.boolean().default(false),
});

/** GET：取得某月份的實際成本；內建類別即使沒資料也會補 0，另外附上使用者建立的自訂類別 */
export async function GET(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { searchParams } = new URL(req.nextUrl);
    const periodMonth = searchParams.get('periodMonth');
    if (!periodMonth) return NextResponse.json({ message: '請提供 periodMonth' }, { status: 400 });

    await dbConnect();
    const records = await CostRecord.find({ periodMonth }).lean();
    const byCategory = new Map(records.map((r) => [r.category, r]));

    const known = COST_RECORD_CATEGORIES.map((category) => ({
      category: category as string,
      label: byCategory.get(category)?.label,
      amount: byCategory.get(category)?.amount ?? 0,
    }));

    // 自訂類別（不在內建清單中）依原本建立的順序附在後面
    const custom = records
      .filter((record) => !COST_RECORD_CATEGORIES.includes(record.category as (typeof COST_RECORD_CATEGORIES)[number]))
      .map((record) => ({ category: record.category, label: record.label, amount: record.amount }));

    return NextResponse.json({ message: 'success', data: [...known, ...custom] });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}

/**
 * PUT：每月成本登錄。金額為當月實際發生數，採覆蓋式更新（不做版本歷史──
 * 歷史保護是靠報價當下把成本模型快照寫進 QuotationItem）。
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const body = (await req.json()) as Record<string, unknown>;
    const { periodMonth, entries, replaceMissing } = UpsertCostRecordsSchema.parse(body);

    await dbConnect();

    await Promise.all(
      entries.map((entry) =>
        CostRecord.findOneAndUpdate(
          { category: entry.category, periodMonth },
          {
            category: entry.category,
            label: entry.label,
            periodMonth,
            amount: entry.amount,
            createdBy: auth.userId,
          },
          { upsert: true, new: true },
        ),
      ),
    );

    if (replaceMissing) {
      await CostRecord.deleteMany({
        periodMonth,
        category: { $nin: entries.map((entry) => entry.category) },
      });
    }

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
