import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import CostRecord from '@/models/cost-record';
import Quotation from '@/models/quotation';
import Alert from '@/models/alert';
import { COST_RECORD_CATEGORIES } from '@/models/schemas/cost-record';
import { computePercentChange } from '@/lib/pricing/versioning';

function toPeriodMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

async function sumCostRecords(periodMonth: string) {
  const records = await CostRecord.find({ periodMonth }).lean();
  const byCategory: Record<string, number> = Object.fromEntries(COST_RECORD_CATEGORIES.map((c) => [c, 0]));
  let total = 0;
  for (const record of records) {
    byCategory[record.category] = (byCategory[record.category] || 0) + record.amount;
    total += record.amount;
  }
  return { byCategory, total };
}

async function sumQuotationRevenue(from: Date, to: Date) {
  const quotations = await Quotation.find(
    { status: 'final', quotationDate: { $gte: from, $lt: to } },
    { chosenPrice: 1, marginAmount: 1 },
  ).lean();
  return quotations.reduce(
    (acc, q) => {
      acc.revenue += q.chosenPrice || 0;
      acc.margin += q.marginAmount || 0;
      return acc;
    },
    { revenue: 0, margin: 0 },
  );
}

/**
 * 首頁 Dashboard 摘要：本月營收/成本/毛利/毛利率、各項成本、MoM/YoY 變化、警示統計。
 */
export async function GET() {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    await dbConnect();

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYearSameMonthDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const [thisMonthCost, lastMonthCost, lastYearCost, revenue, openAlerts] = await Promise.all([
      sumCostRecords(toPeriodMonth(now)),
      sumCostRecords(toPeriodMonth(lastMonthDate)),
      sumCostRecords(toPeriodMonth(lastYearSameMonthDate)),
      sumQuotationRevenue(thisMonthStart, nextMonthStart),
      Alert.find({ status: 'open' }, { severity: 1 }).lean(),
    ]);

    const marginAmount = revenue.margin;
    const marginRatePercent = revenue.revenue > 0 ? (marginAmount / revenue.revenue) * 100 : 0;

    const alertCounts = { red: 0, orange: 0, yellow: 0 };
    for (const alert of openAlerts) {
      if (alert.severity === 'red') alertCounts.red += 1;
      else if (alert.severity === 'orange') alertCounts.orange += 1;
      else if (alert.severity === 'yellow') alertCounts.yellow += 1;
    }
    const isStable = alertCounts.red === 0 && alertCounts.orange === 0 && alertCounts.yellow === 0;

    return NextResponse.json({
      message: 'success',
      data: {
        periodMonth: toPeriodMonth(now),
        revenue: revenue.revenue,
        totalCost: thisMonthCost.total,
        marginAmount,
        marginRatePercent,
        costByCategory: thisMonthCost.byCategory,
        momCostChangePercent: computePercentChange(lastMonthCost.total, thisMonthCost.total),
        yoyCostChangePercent: computePercentChange(lastYearCost.total, thisMonthCost.total),
        alerts: { ...alertCounts, isStable },
      },
    });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
