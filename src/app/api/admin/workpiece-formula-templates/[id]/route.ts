import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import WorkpieceFormulaTemplate from '@/models/workpiece-formula-template';
import { buildFormulaCode } from '@/models/schemas/workpiece-formula-template';

function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json({ message: '資料格式錯誤', errors: err.flatten().fieldErrors }, { status: 400 });
  }
  return NextResponse.json(
    { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
    { status: 500 },
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { id } = await params;
    await dbConnect();
    const data = await WorkpieceFormulaTemplate.findById(id).lean();
    if (!data) return NextResponse.json({ message: '找不到資料' }, { status: 404 });
    return NextResponse.json({ message: 'success', data });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * PATCH：修改範本（名稱／面數／啟用狀態）。這裡刻意不做版本歷史——
 * 保護舊報價不受影響的機制是 QuotationItem 上的快照欄位，不是這裡的範本本身。
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { id } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    await dbConnect();

    const current = await WorkpieceFormulaTemplate.findById(id);
    if (!current) return NextResponse.json({ message: '找不到資料' }, { status: 404 });

    const merged = {
      lwFaces: body.lwFaces ?? current.lwFaces,
      lhFaces: body.lhFaces ?? current.lhFaces,
      whFaces: body.whFaces ?? current.whFaces,
    };

    if (typeof body.name === 'string') current.name = body.name;
    if (typeof body.isActive === 'boolean') current.isActive = body.isActive;
    current.lwFaces = merged.lwFaces as number;
    current.lhFaces = merged.lhFaces as number;
    current.whFaces = merged.whFaces as number;
    current.code = buildFormulaCode(merged as { lwFaces: number; lhFaces: number; whFaces: number });

    await current.save();

    return NextResponse.json({ message: 'success', data: current });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { id } = await params;
    await dbConnect();
    const data = await WorkpieceFormulaTemplate.findByIdAndDelete(id);
    if (!data) return NextResponse.json({ message: '找不到資料' }, { status: 404 });
    return NextResponse.json({ message: 'success' });
  } catch (err) {
    return handleError(err);
  }
}
