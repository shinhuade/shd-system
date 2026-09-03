import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import ProductionRecord from '@/models/production-record';
import { ProductionRecordSchema } from '@/models/schemas/production-record';

/**
 * GET /api/admin/production-records
 *  - ?periodMonth=YYYY-MM：取單月生產紀錄（沒有則回傳 null）
 *  - 不帶參數：列出全部月份（新到舊），供趨勢分析使用
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    await dbConnect();

    const { searchParams } = new URL(req.nextUrl);
    const periodMonth = searchParams.get('periodMonth');

    if (periodMonth) {
      const record = await ProductionRecord.findOne({ periodMonth }).lean();
      return NextResponse.json({ message: 'success', data: record ?? null });
    }

    const records = await ProductionRecord.find().sort({ periodMonth: -1 }).lean();
    return NextResponse.json({ message: 'success', data: records });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/production-records
 * 每月生產紀錄為「當月實際發生數」，同一個月份覆蓋式更新（不做版本歷史，
 * 歷史保護是靠報價當下把成本模型快照寫進 QuotationItem）。
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const body = (await req.json()) as Record<string, unknown>;
    const validated = ProductionRecordSchema.parse(body);

    await dbConnect();

    const record = await ProductionRecord.findOneAndUpdate(
      { periodMonth: validated.periodMonth },
      { ...validated, createdBy: auth.userId },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({ message: 'success', data: record });
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
