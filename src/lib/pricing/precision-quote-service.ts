import dbConnect from '@/lib/db';
import Material from '@/models/material';
import MaterialPriceHistory from '@/models/material-price-history';
import { getValueAsOf } from './versioning';
import { getCurrentSystemSettings } from './rates-loader';
import { loadCostModel } from './cost-model-loader';
import { buildPrecisionQuote, PowderParams, PrecisionQuoteInput, PrecisionQuoteResult } from './precision-quote';
import { CostModel } from './cost-model';

/**
 * 精算報價的資料庫串接層：把「成本模型 + 粉體資料庫 + 系統設定」組成計算所需的參數，
 * 再交給純函式引擎 buildPrecisionQuote 計算。
 *
 * 粉體單價一律取「報價日當下有效」的歷史版本（沒有歷史版本才退回主檔目前值），
 * 因此補開舊日期的報價也會使用當時的價格。
 */
export interface PrecisionQuoteRequest {
  materialId: string;
  dimensions?: PrecisionQuoteInput['dimensions'];
  faces: PrecisionQuoteInput['faces'];
  filmThicknessUm: number;
  quantity?: number;
  /** 未指定時使用系統設定的公司毛利率標準 */
  targetMarginRatePercent?: number;
  /** 未指定時自動使用最新月份的成本模型 */
  costModelPeriodMonth?: string | null;
  /** 報價日期，決定要取用哪一版粉體價格，預設今天 */
  quotationDate?: Date;
}

export interface MaterialSnapshot {
  materialId: string;
  materialCode: string;
  colorName: string;
  pricePerKg: number;
  lossRatePercent: number;
  /** 粉體價格的生效日期（來自歷史版本），沒有歷史版本時為 undefined */
  priceEffectiveDate?: Date;
}

export interface PrecisionQuoteContext {
  result: PrecisionQuoteResult;
  costModel: CostModel;
  material: MaterialSnapshot;
  powder: PowderParams;
  systemSettingsId: string;
  targetMarginRatePercent: number;
}

export async function calculatePrecisionQuote(request: PrecisionQuoteRequest): Promise<PrecisionQuoteContext> {
  await dbConnect();

  const quotationDate = request.quotationDate ?? new Date();

  const [{ model }, settings, material] = await Promise.all([
    loadCostModel(request.costModelPeriodMonth),
    getCurrentSystemSettings(quotationDate),
    Material.findById(request.materialId).lean(),
  ]);

  if (!material) throw new Error('找不到指定的粉體資料');

  const priceHistory = (await getValueAsOf(
    MaterialPriceHistory,
    'materialId',
    request.materialId,
    quotationDate,
  )) as { pricePerKg?: number; lossRatePercent?: number | null; effectiveDate?: Date } | null;

  const pricePerKg = priceHistory?.pricePerKg ?? material.currentPricePerKg ?? 0;
  const lossRatePercent =
    priceHistory?.lossRatePercent ??
    material.currentLossRatePercent ??
    settings.defaultMaterialLossRatePercent;

  const powder: PowderParams = {
    pricePerKg,
    lossRatePercent,
    densityGPerCm3: settings.powderUsageGramPerM2PerMicron,
    transferEfficiencyPercent: settings.transferEfficiencyPercent,
  };

  const targetMarginRatePercent = request.targetMarginRatePercent ?? settings.targetMarginRatePercent;

  const result = buildPrecisionQuote(
    {
      dimensions: request.dimensions,
      faces: request.faces,
      filmThicknessUm: request.filmThicknessUm,
      quantity: request.quantity,
      targetMarginRatePercent,
    },
    model,
    powder,
  );

  return {
    result,
    costModel: model,
    material: {
      materialId: String(material._id),
      materialCode: material.materialCode,
      colorName: material.colorName,
      pricePerKg,
      lossRatePercent,
      priceEffectiveDate: priceHistory?.effectiveDate,
    },
    powder,
    systemSettingsId: String(settings._id),
    targetMarginRatePercent,
  };
}
