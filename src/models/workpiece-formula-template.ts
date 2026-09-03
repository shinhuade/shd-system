import mongoose, { Schema, Document, Model } from 'mongoose';
import { commonOptions } from '@/lib/db';
import { WorkpieceFormulaTemplateInput } from './schemas/workpiece-formula-template';

export interface IWorkpieceFormulaTemplate extends WorkpieceFormulaTemplateInput, Document {
  code: string;
}

const WorkpieceFormulaTemplateSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, index: true },
    lwFaces: { type: Number, required: true, min: 0, max: 2 },
    lhFaces: { type: Number, required: true, min: 0, max: 2 },
    whFaces: { type: Number, required: true, min: 0, max: 2 },
    isActive: { type: Boolean, default: true },
  },
  commonOptions,
);

// code 一律由 lwFaces/lhFaces/whFaces 自動組成，寫入前同步一次，避免手動繞過表單造成不一致
WorkpieceFormulaTemplateSchema.pre('save', function (this: IWorkpieceFormulaTemplate) {
  this.code = `${this.lwFaces}${this.lhFaces}${this.whFaces}`;
});
WorkpieceFormulaTemplateSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() as Record<string, unknown> & { $set?: Record<string, unknown> };
  const target = update.$set ?? update;
  if (
    target &&
    (target.lwFaces !== undefined || target.lhFaces !== undefined || target.whFaces !== undefined)
  ) {
    // 部分欄位更新時，仍需要完整三個面數才能重新組成 code，交由呼叫端保證一次送滿三個欄位
    if (target.lwFaces !== undefined && target.lhFaces !== undefined && target.whFaces !== undefined) {
      target.code = `${target.lwFaces}${target.lhFaces}${target.whFaces}`;
    }
  }
});

const WorkpieceFormulaTemplate: Model<IWorkpieceFormulaTemplate> =
  mongoose.models.WorkpieceFormulaTemplate ||
  mongoose.model<IWorkpieceFormulaTemplate>('WorkpieceFormulaTemplate', WorkpieceFormulaTemplateSchema);

export default WorkpieceFormulaTemplate;
