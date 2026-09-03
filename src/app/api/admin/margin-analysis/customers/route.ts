import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import Quotation from '@/models/quotation';
import { getCurrentSystemSettings } from '@/lib/pricing/rates-loader';

/**
 * 十四、客戶毛利分析（基礎版）：依客戶彙總營收/成本/毛利，
 * 並用「客戶專屬毛利率標準」或（未設定時）公司標準毛利率標示是否偏低。
 */
export async function GET() {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    await dbConnect();
    const settings = await getCurrentSystemSettings();

    const raw = await Quotation.aggregate([
      { $match: { status: 'final' } },
      {
        $group: {
          _id: '$customerId',
          quotationCount: { $sum: 1 },
          totalRevenue: { $sum: '$chosenPrice' },
          totalCost: { $sum: '$totalCostPrice' },
          totalMargin: { $sum: '$marginAmount' },
        },
      },
      {
        $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    ]);

    const data = raw
      .map((row) => {
        const marginRatePercent = row.totalRevenue > 0 ? (row.totalMargin / row.totalRevenue) * 100 : 0;
        const targetMarginRatePercent = row.customer?.targetMarginRatePercent ?? settings.targetMarginRatePercent;
        return {
          customerId: row._id,
          customerName: row.customer?.name || '(未知客戶)',
          quotationCount: row.quotationCount,
          totalRevenue: row.totalRevenue,
          totalCost: row.totalCost,
          totalMargin: row.totalMargin,
          marginRatePercent,
          targetMarginRatePercent,
          belowTarget: marginRatePercent < targetMarginRatePercent,
        };
      })
      .sort((a, b) => a.marginRatePercent - b.marginRatePercent);

    return NextResponse.json({ message: 'success', data });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
