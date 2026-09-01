import dbConnect from '@/lib/db';
import Material from '@/models/material';
import PackagingItem from '@/models/packaging-item';
import ProcessingCostParams, { IProcessingCostParams } from '@/models/processing-cost-params';
import SystemSettings, { ISystemSettings } from '@/models/system-settings';
import { RateSnapshot, PricingConfigSnapshot } from './types';

/**
 * 本模組是計算引擎中唯一會呼叫 dbConnect() 的地方，負責把 Material / PackagingItem /
 * ProcessingCostParams(最新版) / SystemSettings(最新版) 組成計算引擎需要的快照物件。
 * src/lib/pricing/ 底下其餘模組皆為不接觸資料庫的純函式。
 */

export async function getCurrentProcessingParams(asOfDate: Date = new Date()) {
  await dbConnect();
  const doc = await ProcessingCostParams.findOne({ effectiveDate: { $lte: asOfDate } }).sort({ effectiveDate: -1 });
  if (!doc) throw new Error('尚未設定加工成本參數，請先至「成本管理」建立加工參數');
  return doc as IProcessingCostParams & { _id: unknown };
}

export async function getCurrentSystemSettings(asOfDate: Date = new Date()) {
  await dbConnect();
  const doc = await SystemSettings.findOne({ effectiveDate: { $lte: asOfDate } }).sort({ effectiveDate: -1 });
  if (!doc) throw new Error('尚未設定系統參數，請先至「系統設定」建立參數');
  return doc as ISystemSettings & { _id: unknown };
}

export function toPricingConfigSnapshot(settings: ISystemSettings): PricingConfigSnapshot {
  return {
    defaultMaterialLossRatePercent: settings.defaultMaterialLossRatePercent,
    standardMarkupPercent: settings.standardMarkupPercent,
    highMarginMarkupPercent: settings.highMarginMarkupPercent,
    reQuoteAlertThresholdPercent: settings.reQuoteAlertThresholdPercent,
    targetMarginRatePercent: settings.targetMarginRatePercent,
    powderUsageGramPerM2PerMicron: settings.powderUsageGramPerM2PerMicron,
    transferEfficiencyPercent: settings.transferEfficiencyPercent,
    standardMonthlyOperatingHours: settings.standardMonthlyOperatingHours,
    standardCycleHoursPerBatch: settings.standardCycleHoursPerBatch,
  };
}

export interface LoadedRateContext {
  rates: RateSnapshot;
  config: PricingConfigSnapshot;
  processingParamsId: string;
  pricingConfigId: string;
}

/**
 * 組出計算一張工件報價所需的完整費率快照。
 */
export async function loadRateContext(materialId: string, packagingId?: string | null): Promise<LoadedRateContext> {
  await dbConnect();

  const [material, packaging, processingParams, settings] = await Promise.all([
    Material.findById(materialId),
    packagingId ? PackagingItem.findById(packagingId) : Promise.resolve(null),
    getCurrentProcessingParams(),
    getCurrentSystemSettings(),
  ]);

  if (!material) throw new Error('找不到指定的粉料資料');

  const config = toPricingConfigSnapshot(settings);

  const rates: RateSnapshot = {
    materialPricePerKg: material.currentPricePerKg,
    materialLossRatePercent: material.currentLossRatePercent ?? config.defaultMaterialLossRatePercent,
    packagingUnitPrice: packaging?.currentUnitPrice ?? 0,
    hourlyLaborCost: processingParams.hourlyLaborCost,
    hourlyGasCost: processingParams.hourlyGasCost,
    hourlyElectricityCost: processingParams.hourlyElectricityCost,
    hourlyWaterCost: processingParams.hourlyWaterCost ?? 0,
    hourlyEquipmentCost: processingParams.hourlyEquipmentCost,
    hourlyFactoryCost: processingParams.hourlyFactoryCost,
    hourlyManagementCost: processingParams.hourlyManagementCost,
  };

  return {
    rates,
    config,
    processingParamsId: String(processingParams._id),
    pricingConfigId: String(settings._id),
  };
}
