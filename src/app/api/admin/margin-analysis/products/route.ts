import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import QuotationItem from '@/models/quotation-item';

/**
 * 八/十三、產品毛利分析（基礎版）：依工件名稱彙總營收/成本/毛利，可依毛利率排序。
 */
export async function GET() {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    await dbConnect();

    const data = await QuotationItem.aggregate([
      {
        $group: {
          _id: '$workpieceName',
          quotedCount: { $sum: 1 },
          totalRevenue: { $sum: '$chosenPrice' },
          totalCost: { $sum: '$costBreakdown.totalCost' },
          totalMargin: { $sum: '$marginAmount' },
        },
      },
      {
        $project: {
          _id: 0,
          workpieceName: '$_id',
          quotedCount: 1,
          totalRevenue: 1,
          totalCost: 1,
          totalMargin: 1,
          marginRatePercent: {
            $cond: [{ $gt: ['$totalRevenue', 0] }, { $multiply: [{ $divide: ['$totalMargin', '$totalRevenue'] }, 100] }, 0],
          },
        },
      },
      { $sort: { marginRatePercent: -1 } },
    ]);

    return NextResponse.json({ message: 'success', data });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
