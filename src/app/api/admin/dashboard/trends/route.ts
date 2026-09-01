import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import CostRecord from '@/models/cost-record';
import Quotation from '@/models/quotation';
import QuotationItem from '@/models/quotation-item';
import { COST_RECORD_CATEGORIES } from '@/models/schemas/cost-record';

type Range = 'month' | 'quarter' | 'year';
type CostRecordCategory = (typeof COST_RECORD_CATEGORIES)[number];

const COST_RECORD_METRIC_CATEGORY: Record<string, CostRecordCategory> = {
  material_cost: 'material',
  packaging_cost: 'packaging',
  gas: 'gas',
  water: 'water',
  electricity: 'electricity',
  labor: 'labor',
  fixed_cost: 'fixed_other',
};

/** 把 YYYY-MM 期間字串依 range 重新分桶（月不變、季合併為 YYYY-Qn、年合併為 YYYY） */
function bucketPeriod(periodMonth: string, range: Range): string {
  if (range === 'month') return periodMonth;
  const [yearStr, monthStr] = periodMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (range === 'year') return String(year);
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

async function getCostRecordTrend(category: CostRecordCategory, range: Range) {
  const records = await CostRecord.find({ category }).sort('periodMonth').lean();
  const buckets = new Map<string, number>();
  for (const record of records) {
    const key = bucketPeriod(record.periodMonth, range);
    buckets.set(key, (buckets.get(key) || 0) + record.amount);
  }
  return Array.from(buckets.entries()).map(([period, value]) => ({ period, value }));
}

function dateToPeriod(date: Date, range: Range): string {
  const periodMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return bucketPeriod(periodMonth, range);
}

async function getMarginRateTrend(range: Range) {
  const quotations = await Quotation.find(
    { status: 'final' },
    { quotationDate: 1, marginAmount: 1, chosenPrice: 1 },
  ).lean();

  const buckets = new Map<string, { margin: number; revenue: number }>();
  for (const q of quotations) {
    const key = dateToPeriod(new Date(q.quotationDate), range);
    const bucket = buckets.get(key) || { margin: 0, revenue: 0 };
    bucket.margin += q.marginAmount || 0;
    bucket.revenue += q.chosenPrice || 0;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { margin, revenue }]) => ({ period, value: revenue > 0 ? (margin / revenue) * 100 : 0 }));
}

async function getProcessingUnitCostTrend(range: Range) {
  const items = await QuotationItem.find({}, { createdAt: 1, 'costBreakdown.totalCost': 1, quantity: 1 }).lean();

  const buckets = new Map<string, { totalCost: number; quantity: number }>();
  for (const item of items) {
    const createdAt = (item as unknown as { createdAt: Date }).createdAt;
    const key = dateToPeriod(new Date(createdAt), range);
    const bucket = buckets.get(key) || { totalCost: 0, quantity: 0 };
    bucket.totalCost += item.costBreakdown?.totalCost || 0;
    bucket.quantity += item.quantity || 0;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { totalCost, quantity }]) => ({ period, value: quantity > 0 ? totalCost / quantity : 0 }));
}

/**
 * 十、成本趨勢圖：依 metric/range 回傳時間序列資料點。
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { searchParams } = new URL(req.nextUrl);
    const metric = searchParams.get('metric') || 'material_cost';
    const range = (searchParams.get('range') as Range) || 'month';

    await dbConnect();

    let data: { period: string; value: number }[];

    if (metric === 'margin_rate') {
      data = await getMarginRateTrend(range);
    } else if (metric === 'processing_unit_cost') {
      data = await getProcessingUnitCostTrend(range);
    } else {
      const category = COST_RECORD_METRIC_CATEGORY[metric];
      if (!category) return NextResponse.json({ message: `不支援的 metric: ${metric}` }, { status: 400 });
      data = (await getCostRecordTrend(category, range)).sort((a, b) => a.period.localeCompare(b.period));
    }

    return NextResponse.json({ message: 'success', data });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
