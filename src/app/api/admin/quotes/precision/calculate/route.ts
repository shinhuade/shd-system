import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { validateAdmin } from '@/lib/auth/server';
import { PrecisionQuoteCalcSchema } from '@/models/schemas/precision-quote-request';
import { calculatePrecisionQuote } from '@/lib/pricing/precision-quote-service';

/**
 * POST /api/admin/quotes/precision/calculate
 * 精算報價試算（純計算、不落地）。成本一律由伺服器端從成本模型與粉體資料庫取得。
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const body = (await req.json()) as Record<string, unknown>;
    const input = PrecisionQuoteCalcSchema.parse(body);

    const context = await calculatePrecisionQuote({
      materialId: input.materialId,
      dimensions: input.dimensions,
      faces: { lwFaces: input.lwFaces, lhFaces: input.lhFaces, whFaces: input.whFaces },
      filmThicknessUm: input.filmThicknessUm,
      quantity: input.quantity,
      targetMarginRatePercent: input.targetMarginRatePercent,
      costModelPeriodMonth: input.costModelPeriodMonth,
    });

    return NextResponse.json({
      message: 'success',
      data: {
        result: context.result,
        costModel: context.costModel,
        material: context.material,
        powder: context.powder,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ message: '資料格式錯誤', errors: err.flatten().fieldErrors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : '伺服器發生錯誤';
    const isMissingData = message.includes('尚未') || message.includes('找不到') || message.includes('無法');
    return NextResponse.json({ message, error: message }, { status: isMissingData ? 400 : 500 });
  }
}
