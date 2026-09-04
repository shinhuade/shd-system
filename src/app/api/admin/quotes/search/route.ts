import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import Quotation from '@/models/quotation';

/**
 * 報價紀錄搜尋：依「客戶名稱」或「工件名稱」查詢。
 * 通用 CRUD 的 buildSearchQuery 只能對 Quotation 自身欄位做 regex，
 * 碰不到關聯的 Customer / QuotationItem，因此這裡改用 $lookup 聚合查詢。
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const { searchParams } = new URL(req.nextUrl);
    const keyword = searchParams.get('keyword')?.trim();
    const page = Number(searchParams.get('page') || 1);
    const limit = Number(searchParams.get('limit') || 10);
    const skip = (page - 1) * limit;

    await dbConnect();

    const matchStage = keyword
      ? {
          $match: {
            $or: [
              { quotationNo: { $regex: keyword, $options: 'i' } },
              { 'customer.name': { $regex: keyword, $options: 'i' } },
              { 'items.workpieceName': { $regex: keyword, $options: 'i' } },
            ],
          },
        }
      : { $match: {} };

    const basePipeline = [
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'quotationitems',
          localField: '_id',
          foreignField: 'quotationId',
          as: 'items',
        },
      },
      matchStage,
    ];

    const [data, totalResult] = await Promise.all([
      Quotation.aggregate([
        ...basePipeline,
        { $sort: { quotationDate: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            quotationNo: 1,
            quotationDate: 1,
            status: 1,
            quoteMode: 1,
            chosenPrice: 1,
            marginRatePercent: 1,
            'customer._id': 1,
            'customer.name': 1,
            workpieceNames: '$items.workpieceName',
            itemCount: { $size: '$items' },
          },
        },
      ]),
      Quotation.aggregate([...basePipeline, { $count: 'total' }]),
    ]);

    const total = totalResult[0]?.total || 0;

    return NextResponse.json({ message: 'success', total, data });
  } catch (err) {
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
