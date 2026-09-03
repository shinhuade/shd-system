import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import Quotation from '@/models/quotation';
import QuotationItem from '@/models/quotation-item';
import { CreateQuotationRequestSchema } from '@/models/schemas/quote-request';
import { calculateQuoteItem, resolveChosenPrice } from '@/lib/pricing/quote-service';

async function generateQuotationNo(quotationDate: Date): Promise<string> {
  const year = quotationDate.getFullYear();
  const prefix = `Q-${year}-`;
  const count = await Quotation.countDocuments({ quotationNo: { $regex: `^${prefix}` } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

/**
 * 建立正式報價單：伺服器端對每一項工件重新計算成本（不信任前端數字），
 * 並把當下的費率快照完整寫入 QuotationItem，供之後的漲價提醒比對使用。
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const body = (await req.json()) as Record<string, unknown>;
    const validated = CreateQuotationRequestSchema.parse(body);

    await dbConnect();

    const quotationDate = validated.quotationDate ?? new Date();

    let processingParamsSnapshotId: string | undefined;
    let pricingConfigSnapshotId: string | undefined;

    const computedItems = await Promise.all(
      validated.items.map(async (item) => {
        const { breakdown, suggestion, processingParamsId, pricingConfigId, rates } = await calculateQuoteItem(
          item.materialId,
          item.packagingId,
          item,
        );
        processingParamsSnapshotId = processingParamsId;
        pricingConfigSnapshotId = pricingConfigId;

        const chosen = resolveChosenPrice(suggestion, item.chosenTier, item.customPrice);

        return { item, breakdown, suggestion, rates, chosen };
      }),
    );

    let quotationNo = await generateQuotationNo(quotationDate);

    const totals = computedItems.reduce(
      (acc, { suggestion, chosen }) => {
        acc.totalCostPrice += suggestion.costPrice;
        acc.totalStandardPrice += suggestion.standardPrice;
        acc.totalHighMarginPrice += suggestion.highMarginPrice;
        acc.chosenPrice += chosen.price;
        acc.marginAmount += chosen.marginAmount;
        return acc;
      },
      { totalCostPrice: 0, totalStandardPrice: 0, totalHighMarginPrice: 0, chosenPrice: 0, marginAmount: 0 },
    );

    const marginRatePercent = totals.chosenPrice > 0 ? (totals.marginAmount / totals.chosenPrice) * 100 : 0;
    const markupRatePercent = totals.totalCostPrice > 0 ? (totals.marginAmount / totals.totalCostPrice) * 100 : 0;

    let quotation;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        quotation = await Quotation.create({
          quotationNo,
          customerId: validated.customerId,
          quotationDate,
          status: validated.status,
          createdBy: auth.userId,
          notes: validated.notes,
          totalCostPrice: totals.totalCostPrice,
          totalStandardPrice: totals.totalStandardPrice,
          totalHighMarginPrice: totals.totalHighMarginPrice,
          chosenTier: validated.items.length === 1 ? validated.items[0].chosenTier : 'custom',
          chosenPrice: totals.chosenPrice,
          marginAmount: totals.marginAmount,
          marginRatePercent,
          markupRatePercent,
          pricingConfigSnapshotId,
          processingParamsSnapshotId,
        });
        break;
      } catch (err: unknown) {
        const isDuplicateKey = typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000;
        if (!isDuplicateKey || attempt === 2) throw err;
        quotationNo = await generateQuotationNo(quotationDate);
      }
    }

    if (!quotation) throw new Error('報價單建立失敗');

    const items = await QuotationItem.insertMany(
      computedItems.map(({ item, breakdown, suggestion, rates, chosen }) => ({
        quotationId: quotation._id,
        workpieceName: item.workpieceName,
        workpieceCode: item.workpieceCode,
        dimensions: item.dimensions,
        quantity: item.quantity,
        unitWeightKg: item.unitWeightKg,
        totalWeightKg: item.totalWeightKg,
        materialTypeLabel: item.materialTypeLabel,
        surfaceCondition: item.surfaceCondition,
        needsPretreatment: item.needsPretreatment,
        needsRustProof: item.needsRustProof,
        needsRustRemoval: item.needsRustRemoval,
        paintColor: item.paintColor,
        materialId: item.materialId,
        estimatedFilmThicknessUm: item.estimatedFilmThicknessUm,
        overrideMaterialUsageKg: item.overrideMaterialUsageKg,
        packagingId: item.packagingId,
        packagingQuantity: item.packagingQuantity,
        workpieceFormulaTemplateId: item.workpieceFormulaTemplateId,
        formulaCode: breakdown.formulaCode,
        lwFaces: item.lwFaces,
        lhFaces: item.lhFaces,
        whFaces: item.whFaces,
        totalAreaCm2: breakdown.totalAreaCm2,
        caiCount: breakdown.caiCount,
        hangCount: item.hangCount,
        ovenCapacityPerBatch: item.ovenCapacityPerBatch,
        batchCount: item.batchCount,
        estimatedProcessingHours: breakdown.processingHours,
        costParamsSnapshot: {
          materialPricePerKg: rates.materialPricePerKg,
          materialLossRatePercent: rates.materialLossRatePercent,
          packagingUnitPrice: rates.packagingUnitPrice,
          hourlyLaborCost: rates.hourlyLaborCost,
          hourlyGasCost: rates.hourlyGasCost,
          hourlyElectricityCost: rates.hourlyElectricityCost,
          hourlyEquipmentCost: rates.hourlyEquipmentCost,
          hourlyFactoryCost: rates.hourlyFactoryCost,
          hourlyManagementCost: rates.hourlyManagementCost,
        },
        costBreakdown: breakdown,
        costPrice: suggestion.costPrice,
        standardPrice: suggestion.standardPrice,
        highMarginPrice: suggestion.highMarginPrice,
        chosenPrice: chosen.price,
        marginAmount: chosen.marginAmount,
        marginRatePercent: chosen.marginRatePercent,
        markupRatePercent: chosen.markupRatePercent,
      })),
    );

    return NextResponse.json({ message: 'success', data: { quotation, items } }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ message: '資料格式錯誤', errors: err.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json(
      { message: '伺服器發生錯誤', error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
