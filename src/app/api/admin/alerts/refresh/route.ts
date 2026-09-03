import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import Quotation from '@/models/quotation';
import QuotationItem from '@/models/quotation-item';
import Alert from '@/models/alert';
import { checkQuotationItemRequote } from '@/lib/pricing/requote-check-service';

const ALERT_TYPE_BY_SEVERITY: Record<'red' | 'orange' | 'yellow', 'cost_increase' | 'margin_drop' | 'recommend_requote'> = {
  red: 'cost_increase',
  orange: 'margin_drop',
  yellow: 'recommend_requote',
};

/**
 * 掃描近 12 個月的正式報價，重新計算現在成本，超過門檻就 upsert 一筆 Alert；
 * 若原本有開啟中的警示但現在恢復正常，則自動標記為已解決。
 * 系統沒有排程機制，此端點靠 Dashboard 載入時與手動「重新檢查」按鈕觸發。
 */
export async function POST() {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    await dbConnect();

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const quotations = await Quotation.find({ status: 'final', quotationDate: { $gte: twelveMonthsAgo } }, { _id: 1 }).lean();
    const quotationIds = quotations.map((q) => q._id);

    const items = await QuotationItem.find({ quotationId: { $in: quotationIds } });

    let openCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const result = await checkQuotationItemRequote(item);
        const existingOpenAlert = await Alert.findOne({ quotationItemId: item._id, status: 'open' });

        if (result.severity === 'green') {
          if (existingOpenAlert) {
            // 成本已回穩，自動結案
            existingOpenAlert.set('status', 'dismissed');
            existingOpenAlert.set('resolvedAt', new Date());
            await existingOpenAlert.save();
          }
          continue;
        }

        openCount += 1;
        const alertData = {
          type: ALERT_TYPE_BY_SEVERITY[result.severity],
          quotationId: item.quotationId,
          quotationItemId: item._id,
          workpieceName: result.workpieceName,
          originalTotalCost: result.originalTotalCost,
          currentTotalCost: result.currentTotalCost,
          percentChange: result.percentChange,
          originalMarginRatePercent: item.marginRatePercent,
          currentMarginRateIfUnchanged: result.marginRateIfUnchanged,
          suggestedNewPrice: result.suggestedNewPrice,
          severity: result.severity,
        };

        if (existingOpenAlert) {
          existingOpenAlert.set(alertData);
          await existingOpenAlert.save();
        } else {
          await Alert.create({ ...alertData, status: 'open' });
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : '未知錯誤');
      }
    }

    return NextResponse.json({ message: 'success', data: { checkedItems: items.length, openAlerts: openCount, errors } });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
