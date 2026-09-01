import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import QuotationItem from '@/models/quotation-item';
import { checkQuotationItemRequote } from '@/lib/pricing/requote-check-service';

/**
 * 十一、智慧漲價提醒：用「今天」的最新費率，重新計算此報價單各工件的成本，
 * 並與當初報價時寫入 QuotationItem 的成本快照比對。
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { id } = await params;
    await dbConnect();

    const items = await QuotationItem.find({ quotationId: id });
    if (items.length === 0) return NextResponse.json({ message: '找不到報價單明細' }, { status: 404 });

    const results = await Promise.all(items.map((item) => checkQuotationItemRequote(item)));

    return NextResponse.json({ message: 'success', data: results });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
