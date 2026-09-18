import { NextRequest, NextResponse } from 'next/server';
import { validateAdmin } from '@/lib/auth/server';
import { estimateMonthlyGasCost } from '@/lib/pricing/gas-cost-service';
import { periodMonthField } from '@/models/schemas/cost-record';

/**
 * GET /api/admin/cost-records/gas-estimate?periodMonth=YYYY-MM
 *
 * 用當月生產紀錄的瓦斯用量與當月有效的瓦斯牌價，試算天然氣與桶裝瓦斯的當月成本，
 * 供「每月成本紀錄」一鍵帶入金額，不必自己按計算機。
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { searchParams } = new URL(req.nextUrl);
    const parsed = periodMonthField.safeParse(searchParams.get('periodMonth'));
    if (!parsed.success) {
      return NextResponse.json({ message: '月份格式須為 YYYY-MM' }, { status: 400 });
    }

    const data = await estimateMonthlyGasCost(parsed.data);
    return NextResponse.json({ message: 'success', data });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
