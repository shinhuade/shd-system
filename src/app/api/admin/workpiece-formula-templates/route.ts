import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import WorkpieceFormulaTemplate from '@/models/workpiece-formula-template';
import { WorkpieceFormulaTemplateSchema, buildFormulaCode } from '@/models/schemas/workpiece-formula-template';

function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json({ message: '資料格式錯誤', errors: err.flatten().fieldErrors }, { status: 400 });
  }
  return NextResponse.json(
    { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
    { status: 500 },
  );
}

/** GET：面數公式範本列表（供報價精靈選擇、供設定頁管理） */
export async function GET() {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    await dbConnect();
    const data = await WorkpieceFormulaTemplate.find().sort('createdAt').lean();
    return NextResponse.json({ message: 'success', data });
  } catch (err) {
    return handleError(err);
  }
}

/** POST：新增範本，code 由三個面數自動組成 */
export async function POST(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const body = (await req.json()) as Record<string, unknown>;
    const validated = WorkpieceFormulaTemplateSchema.parse(body);

    await dbConnect();
    const data = await WorkpieceFormulaTemplate.create({ ...validated, code: buildFormulaCode(validated) });
    return NextResponse.json({ message: 'success', data }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
