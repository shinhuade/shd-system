import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { ProcessingCostParamsInput } from './schemas/processing-cost-params';

export interface IProcessingCostParams extends Omit<ProcessingCostParamsInput, 'createdBy'>, Document {
  createdBy?: mongoose.Types.ObjectId;
}

const ProcessingCostParamsSchema: Schema = new Schema(
  {
    hourlyLaborCost: { type: Number, required: true },
    hourlyGasCost: { type: Number, required: true },
    hourlyElectricityCost: { type: Number, required: true },
    hourlyWaterCost: { type: Number, default: 0 },
    hourlyEquipmentCost: { type: Number, required: true },
    hourlyFactoryCost: { type: Number, required: true },
    hourlyManagementCost: { type: Number, required: true },
    effectiveDate: { type: Date, required: true, index: true },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  commonOptions,
);

const ProcessingCostParams: Model<IProcessingCostParams> =
  mongoose.models.ProcessingCostParams ||
  mongoose.model<IProcessingCostParams>('ProcessingCostParams', ProcessingCostParamsSchema);

export default ProcessingCostParams;
