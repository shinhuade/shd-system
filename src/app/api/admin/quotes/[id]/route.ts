import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import Quotation from '@/models/quotation';
import QuotationItem from '@/models/quotation-item';
import '@/models/customer';

/** 報價單詳情：頭 + 明細（含客戶資料），供報價紀錄詳情頁使用 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { id } = await params;
    await dbConnect();

    const quotation = await Quotation.findById(id).populate('customerId').lean();
    if (!quotation) return NextResponse.json({ message: '找不到報價單' }, { status: 404 });

    const items = await QuotationItem.find({ quotationId: id }).sort('createdAt').lean();

    return NextResponse.json({ message: 'success', data: { quotation, items } });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
