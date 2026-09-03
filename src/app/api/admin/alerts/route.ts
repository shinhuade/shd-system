import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import Alert from '@/models/alert';
import { ALERT_STATUSES } from '@/models/schemas/alert';

export async function GET(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { searchParams } = new URL(req.nextUrl);
    const statusParam = searchParams.get('status');
    const status = statusParam && (ALERT_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as (typeof ALERT_STATUSES)[number]) : undefined;

    await dbConnect();
    const query = status ? { status } : {};
    const data = await Alert.find(query).sort('-createdAt').lean();

    return NextResponse.json({ message: 'success', data });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
