import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import dbConnect from '@/lib/db';
import { validateAdmin } from '@/lib/auth/server';
import Quotation from '@/models/quotation';
import QuotationItem from '@/models/quotation-item';
import { CreatePrecisionQuotationSchema } from '@/models/schemas/precision-quote-request';
import { calculatePrecisionQuote } from '@/lib/pricing/precision-quote-service';

async function generateQuotationNo(quotationDate: Date): Promise<string> {
  const year = quotationDate.getFullYear();
  const prefix = `Q-${year}-`;
  const count = await Quotation.countDocuments({ quotationNo: { $regex: `^${prefix}` } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

/**
 * POST /api/admin/quotes/precision
 *
 * 建立一筆精算報價紀錄。伺服器端會重新計算（不信任前端送來的金額），
 * 並把「當時的成本模型 / 粉體單價 / 每才成本 / 目標毛利率」完整快照寫入 QuotationItem，
 * 確保之後成本資料更新時，歷史報價的數字不會被改變。
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await validateAdmin();
    if (!auth.isValid) return auth.response;

    const body = (await req.json()) as Record<string, unknown>;
    const input = CreatePrecisionQuotationSchema.parse(body);

    await dbConnect();

    const quotationDate = input.quotationDate ?? new Date();

    const { result, costModel, material, powder, systemSettingsId, targetMarginRatePercent } =
      await calculatePrecisionQuote({
        materialId: input.materialId,
        dimensions: input.dimensions,
        faces: { lwFaces: input.lwFaces, lhFaces: input.lhFaces, whFaces: input.whFaces },
        filmThicknessUm: input.filmThicknessUm,
        quantity: input.quantity,
        targetMarginRatePercent: input.targetMarginRatePercent,
        costModelPeriodMonth: input.costModelPeriodMonth,
        quotationDate,
      });

    const chosenPrice = input.chosenPrice ?? result.suggestedPrice;
    const totalCost = result.total.totalCost;
    const marginAmount = chosenPrice - totalCost;
    const marginRatePercent = chosenPrice > 0 ? (marginAmount / chosenPrice) * 100 : 0;
    const markupRatePercent = totalCost > 0 ? (marginAmount / totalCost) * 100 : 0;

    let quotationNo = await generateQuotationNo(quotationDate);
    let quotation;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        quotation = await Quotation.create({
          quotationNo,
          quoteMode: 'precision',
          customerId: input.customerId,
          quotationDate,
          status: input.status,
          createdBy: auth.userId,
          notes: input.notes,
          totalCostPrice: totalCost,
          totalStandardPrice: result.suggestedPrice,
          totalHighMarginPrice: result.suggestedPrice,
          chosenTier: 'custom',
          chosenPrice,
          marginAmount,
          marginRatePercent,
          markupRatePercent,
          pricingConfigSnapshotId: systemSettingsId,
        });
        break;
      } catch (err: unknown) {
        const isDuplicateKey =
          typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000;
        if (!isDuplicateKey || attempt === 2) throw err;
        quotationNo = await generateQuotationNo(quotationDate);
      }
    }

    if (!quotation) throw new Error('報價單建立失敗');

    const item = await QuotationItem.create({
      quotationId: quotation._id,
      quoteMode: 'precision',
      workpieceName: input.workpieceName,
      workpieceCode: input.workpieceCode,
      dimensions: input.dimensions,
      quantity: result.quantity,
      materialId: input.materialId,
      estimatedFilmThicknessUm: result.filmThicknessUm,
      overrideMaterialUsageKg: result.powderUsageKg,
      workpieceFormulaTemplateId: input.workpieceFormulaTemplateId,
      formulaCode: result.formulaCode,
      lwFaces: result.lwFaces,
      lhFaces: result.lhFaces,
      whFaces: result.whFaces,
      totalAreaCm2: result.totalAreaCm2,
      caiCount: result.caiCount,
      costParamsSnapshot: {
        materialPricePerKg: material.pricePerKg,
        materialLossRatePercent: material.lossRatePercent,
      },
      costModelSnapshot: {
        periodMonth: costModel.periodMonth,
        producedCai: costModel.producedCai,
        workingDays: costModel.workingDays,
        baseCostTotal: costModel.baseCostTotal,
        baseCostPerCai: costModel.baseCostPerCai,
        laborPerCai: costModel.perCai.labor,
        energyPerCai: costModel.perCai.energy,
        fixedPerCai: costModel.perCai.fixed,
        powderDensityGPerCm3: powder.densityGPerCm3,
        transferEfficiencyPercent: powder.transferEfficiencyPercent,
        powderUsageKg: result.powderUsageKg,
        costPerCai: result.costPerCai,
        targetMarginRatePercent,
      },
      costBreakdown: {
        materialCost: result.total.powderCost,
        laborCost: result.total.laborCost,
        energyCost: result.total.energyCost,
        wastageCost: result.total.powderLossCost,
        indirectCostTotal: result.total.fixedCost,
        totalDirectCost:
          result.total.powderCost + result.total.powderLossCost + result.total.laborCost + result.total.energyCost,
        totalCost,
      },
      costPrice: totalCost,
      standardPrice: result.suggestedPrice,
      highMarginPrice: result.suggestedPrice,
      chosenPrice,
      marginAmount,
      marginRatePercent,
      markupRatePercent,
    });

    return NextResponse.json({ message: 'success', data: { quotation, item } }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ message: '資料格式錯誤', errors: err.flatten().fieldErrors }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : '伺服器發生錯誤';
    const isMissingData = message.includes('尚未') || message.includes('找不到') || message.includes('無法');
    return NextResponse.json({ message, error: message }, { status: isMissingData ? 400 : 500 });
  }
}
