import { z } from 'zod';

/**
 * 面數公式範本：定義「長×寬（前後）/長×高（左右）/寬×高（上下）」三個方向各自需要
 * 計價的面數（0~2），組合成三位數公式（例如 222 完整箱體、221 無蓋箱體、112 洞洞板類）。
 * 不做版本歷史——保護「未來修改範本不影響舊報價」的機制是在 QuotationItem 上
 * 直接快照當時的面數與才數，而不是即時引用這裡的範本。
 */
export const WorkpieceFormulaTemplateSchema = z
  .object({
    name: z.string({ message: '範本名稱必填' }).trim().min(1, { message: '範本名稱必填' }),
    lwFaces: z.number({ message: '長×寬（前後）面數必填' }).int().min(0).max(2),
    lhFaces: z.number({ message: '長×高（左右）面數必填' }).int().min(0).max(2),
    whFaces: z.number({ message: '寬×高（上下）面數必填' }).int().min(0).max(2),
    isActive: z.boolean().default(true),
  })
  .strict();

export type WorkpieceFormulaTemplateInput = z.infer<typeof WorkpieceFormulaTemplateSchema>;

export function buildFormulaCode(faces: { lwFaces: number; lhFaces: number; whFaces: number }): string {
  return `${faces.lwFaces}${faces.lhFaces}${faces.whFaces}`;
}
