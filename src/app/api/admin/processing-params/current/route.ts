import { NextResponse } from 'next/server';
import { validateAdmin } from '@/lib/auth/server';
import { getCurrentProcessingParams } from '@/lib/pricing/rates-loader';

export async function GET() {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const data = await getCurrentProcessingParams();
    return NextResponse.json({ message: 'success', data });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : '伺服器發生錯誤' },
      { status: err instanceof Error && err.message.includes('尚未設定') ? 404 : 500 },
    );
  }
}
