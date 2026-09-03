import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { SystemSettingsInput } from './schemas/system-settings';

export interface ISystemSettings extends Omit<SystemSettingsInput, 'createdBy'>, Document {
  createdBy?: mongoose.Types.ObjectId;
}

const SystemSettingsSchema: Schema = new Schema(
  {
    defaultMaterialLossRatePercent: { type: Number, required: true },
    standardMarkupPercent: { type: Number, required: true },
    highMarginMarkupPercent: { type: Number, required: true },
    reQuoteAlertThresholdPercent: { type: Number, required: true },
    targetMarginRatePercent: { type: Number, required: true },
    powderUsageGramPerM2PerMicron: { type: Number, required: true },
    transferEfficiencyPercent: { type: Number, required: true },
    standardMonthlyOperatingHours: { type: Number, required: true },
    standardCycleHoursPerBatch: { type: Number, required: true },
    // 1 尺 = 幾才；未設定時快速報價的「一尺單價」無法計算（不預設任何猜測值）
    caiPerFoot: { type: Number, default: null },
    effectiveDate: { type: Date, required: true, index: true },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  commonOptions,
);

const SystemSettings: Model<ISystemSettings> =
  mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);

export default SystemSettings;
