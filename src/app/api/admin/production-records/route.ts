import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import ProductionRecord from '@/models/production-record';
import { ProductionRecordSchema, ProductionGasUsageSchema } from '@/models/schemas/production-record';

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

/**
 * PATCH /api/admin/production-records
 *
 * 只更新當月的瓦斯用量三欄（天然氣供氣量／平均熱值／桶裝公斤數），其餘欄位原封不動。
 * 供「每月成本紀錄 → 瓦斯費試算」就地補用量用，使用者不必為了填瓦斯而跳到生產紀錄頁，
 * 也不會因為那一頁的必填欄位（工作天數、生產才數）而被擋住或被覆寫成 0。
 *
 * 該月還沒有生產紀錄時會建立一筆，必填欄位先以 0 帶入，之後到生產紀錄頁補齊即可。
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const body = (await req.json()) as Record<string, unknown>;
    const { periodMonth, ...gasFields } = ProductionGasUsageSchema.parse(body);

    await dbConnect();

    const record = await ProductionRecord.findOneAndUpdate(
      { periodMonth },
      {
        $set: gasFields,
        $setOnInsert: { periodMonth, workingDays: 0, producedCai: 0, createdBy: auth.userId },
      },
      { upsert: true, new: true },
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
