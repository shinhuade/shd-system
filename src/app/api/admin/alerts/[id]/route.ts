import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import Alert from '@/models/alert';
import { ALERT_STATUSES } from '@/models/schemas/alert';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { id } = await params;
    const body = (await req.json()) as { status?: string };

    if (!body.status || !ALERT_STATUSES.includes(body.status as (typeof ALERT_STATUSES)[number])) {
      return NextResponse.json({ message: '狀態不正確' }, { status: 400 });
    }

    await dbConnect();
    const update: Record<string, unknown> = { status: body.status };
    if (body.status !== 'open') update.resolvedAt = new Date();

    const data = await Alert.findByIdAndUpdate(id, update, { new: true });
    if (!data) return NextResponse.json({ message: '找不到資料' }, { status: 404 });

    return NextResponse.json({ message: 'success', data });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
