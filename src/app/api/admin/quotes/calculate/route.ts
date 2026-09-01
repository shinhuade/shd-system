import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { validateAdmin } from '@/lib/auth/server';
import { CalculateQuoteRequestSchema } from '@/models/schemas/quote-request';
import { calculateQuoteItem } from '@/lib/pricing/quote-service';

/**
 * 智慧報價精靈 Step4/5：純計算、不落地。回傳完整成本拆解 + 三種報價建議。
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const body = (await req.json()) as Record<string, unknown>;
    const { materialId, packagingId, workpiece } = CalculateQuoteRequestSchema.parse(body);

    const result = await calculateQuoteItem(materialId, packagingId, workpiece);

    return NextResponse.json({ message: 'success', data: result });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ message: '資料格式錯誤', errors: err.flatten().fieldErrors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : '伺服器發生錯誤';
    const isMissingConfig = message.includes('尚未設定') || message.includes('找不到');
    return NextResponse.json({ message, error: message }, { status: isMissingConfig ? 400 : 500 });
  }
}
