import { Model } from 'mongoose';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = Model<any>;

/**
 * 「主檔目前值快取 + 獨立 History 集合」共用版本化工具。
 * 所有會變動的成本（粉料/包材/水電瓦斯/人工/固定成本）皆透過這裡新增版本，
 * 一律不走通用 CRUD 的 PATCH，確保「不可覆蓋、只能新增版本」的系統原則。
 */

export interface AddVersionOptions {
  ParentModel: AnyModel;
  HistoryModel: AnyModel;
  /** History 文件上，指回主檔 _id 的欄位名稱，例如 'materialId' */
  parentIdField: string;
  parentId: string;
  /** 要寫入 History 的完整資料（含 effectiveDate、note、createdBy、數值欄位） */
  historyData: Record<string, unknown> & { effectiveDate: Date };
  /**
   * History 欄位 -> 主檔快取欄位 的對應，例如
   * { pricePerKg: 'currentPricePerKg', lossRatePercent: 'currentLossRatePercent' }
   */
  cacheFieldMap: Record<string, string>;
  /** 主檔上記錄「目前生效日」的欄位名稱，預設 'lastEffectiveDate' */
  parentEffectiveDateField?: string;
}

export async function addVersion({
  ParentModel,
  HistoryModel,
  parentIdField,
  parentId,
  historyData,
  cacheFieldMap,
  parentEffectiveDateField = 'lastEffectiveDate',
}: AddVersionOptions) {
  const parent = await ParentModel.findById(parentId);
  if (!parent) {
    throw new Error('找不到對應的主檔資料');
  }

  const history = await HistoryModel.create({
    [parentIdField]: parentId,
    ...historyData,
  });

  const currentEffectiveDate = parent.get(parentEffectiveDateField) as Date | undefined;
  const isNewestVersion = !currentEffectiveDate || historyData.effectiveDate >= currentEffectiveDate;

  let parentUpdated = false;
  if (isNewestVersion) {
    for (const [historyField, parentField] of Object.entries(cacheFieldMap)) {
      parent.set(parentField, historyData[historyField]);
    }
    parent.set(parentEffectiveDateField, historyData.effectiveDate);
    await parent.save();
    parentUpdated = true;
  }

  return { history, parentUpdated };
}

/** 查詢某主檔在某個時間點當下生效的版本（找不到則回傳 null） */
export async function getValueAsOf(
  HistoryModel: AnyModel,
  parentIdField: string,
  parentId: string,
  asOfDate: Date,
) {
  return HistoryModel.findOne({ [parentIdField]: parentId, effectiveDate: { $lte: asOfDate } })
    .sort({ effectiveDate: -1 })
    .lean();
}

/** 列出某主檔的歷史版本（新到舊） */
export async function listHistory(HistoryModel: AnyModel, parentIdField: string, parentId: string) {
  return HistoryModel.find({ [parentIdField]: parentId }).sort({ effectiveDate: -1 }).lean();
}

/** 計算兩個數值之間的漲跌幅（%） */
export function computePercentChange(oldValue: number, newValue: number): number {
  if (!oldValue) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}
