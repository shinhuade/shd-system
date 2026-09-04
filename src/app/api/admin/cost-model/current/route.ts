import { NextRequest, NextResponse } from 'next/server';
import { validateAdmin } from '@/lib/auth/server';
import { loadCostModel } from '@/lib/pricing/cost-model-loader';

/**
 * GET /api/admin/cost-model/current
 *
 * 回傳目前的成本模型（每才人工／能源／固定成本）。
 * 不帶參數時自動使用「最新一個有生產紀錄的月份」，也可用 ?periodMonth=YYYY-MM 指定月份。
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { searchParams } = new URL(req.nextUrl);
    const periodMonth = searchParams.get('periodMonth');

    const { model, isLatest } = await loadCostModel(periodMonth);

    return NextResponse.json({ message: 'success', data: { model, isLatest } });
  } catch (err) {
    const message = err instanceof Error ? err.message : '伺服器發生錯誤';
    const isMissingData = message.includes('尚未') || message.includes('無法');
    return NextResponse.json({ message, error: message }, { status: isMissingData ? 400 : 500 });
  }
}
