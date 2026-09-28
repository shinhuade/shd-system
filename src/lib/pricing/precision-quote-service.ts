import dbConnect from '@/lib/db';
import Material from '@/models/material';
import Customer from '@/models/customer';
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
 *
 * 目標毛利率的解析也集中在這裡（見 resolveTargetMarginRate）：試算與存檔走同一支服務，
 * 兩邊才不會一個套到客戶專屬毛利率、另一個用公司標準，算出兩個不同的建議報價。
 */
export interface PrecisionQuoteRequest {
  materialId: string;
  dimensions?: PrecisionQuoteInput['dimensions'];
  faces: PrecisionQuoteInput['faces'];
  filmThicknessUm: number;
  quantity?: number;
  /**
   * 報價對象。用來取出該客戶的專屬毛利率；未指定或該客戶沒設定時退回公司標準。
   * 試算階段可先不指定（還沒選客戶），選定後再帶入重算。
   */
  customerId?: string;
  /** 使用者手動覆寫的目標毛利率。未指定時依客戶專屬 → 公司標準的順序解析 */
  targetMarginRatePercent?: number;
  /** 未指定時自動使用最新月份的成本模型 */
  costModelPeriodMonth?: string | null;
  /** 報價日期，決定要取用哪一版粉體價格，預設今天 */
  quotationDate?: Date;
}

/** 目標毛利率的來源，讓畫面能說清楚這個數字是哪來的 */
export type MarginRateSource = 'input' | 'customer' | 'system';

/**
 * 報價當下的客戶聯絡資料快照。
 *
 * 報價單要印出送貨地址與發票地址，而客戶主檔的地址日後可能變更；
 * 已開出去的報價必須留著當時的內容，因此存檔時連同這份快照寫進報價紀錄，
 * 不在檢視時回頭讀主檔。
 */
export interface CustomerSnapshot {
  name: string;
  customerCode?: string;
  taxId?: string;
  contactPerson?: string;
  phone?: string;
  fax?: string;
  shippingAddress?: string;
  invoiceAddress?: string;
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
  /** 上面那個毛利率是怎麼決定的 */
  marginRateSource: MarginRateSource;
  /** 有指定客戶時的聯絡資料快照，未指定客戶時為 undefined */
  customer?: CustomerSnapshot;
}

/**
 * 目標毛利率的優先順序：使用者手動覆寫 → 客戶專屬 → 公司標準。
 *
 * 客戶專屬毛利率排在公司標準之前，是因為它就是為了「這家客戶談好的條件不同」而存在；
 * 若仍用公司標準，那個欄位等於白填。手動輸入排最前面，讓現場談價時可以臨時讓價。
 */
export function resolveTargetMarginRate(
  inputRate: number | undefined,
  customerRate: number | null | undefined,
  systemRate: number,
): { targetMarginRatePercent: number; marginRateSource: MarginRateSource } {
  if (typeof inputRate === 'number') {
    return { targetMarginRatePercent: inputRate, marginRateSource: 'input' };
  }
  if (typeof customerRate === 'number') {
    return { targetMarginRatePercent: customerRate, marginRateSource: 'customer' };
  }
  return { targetMarginRatePercent: systemRate, marginRateSource: 'system' };
}

export async function calculatePrecisionQuote(request: PrecisionQuoteRequest): Promise<PrecisionQuoteContext> {
  await dbConnect();

  const quotationDate = request.quotationDate ?? new Date();

  const [{ model }, settings, material, customer] = await Promise.all([
    loadCostModel(request.costModelPeriodMonth),
    getCurrentSystemSettings(quotationDate),
    Material.findById(request.materialId).lean(),
    request.customerId ? Customer.findById(request.customerId).lean() : Promise.resolve(null),
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

  const { targetMarginRatePercent, marginRateSource } = resolveTargetMarginRate(
    request.targetMarginRatePercent,
    customer?.targetMarginRatePercent,
    settings.targetMarginRatePercent,
  );

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
    marginRateSource,
    customer: customer
      ? {
          name: customer.name,
          customerCode: customer.customerCode,
          taxId: customer.taxId,
          contactPerson: customer.contactPerson,
          phone: customer.phone,
          fax: customer.fax,
          shippingAddress: customer.shippingAddress,
          invoiceAddress: customer.invoiceAddress,
        }
      : undefined,
  };
}
