'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaceCounts, buildFormulaCode } from '@/lib/pricing/area-formula';
import { DEFAULT_FORMULA_TEMPLATES } from '@/models/schemas/workpiece-formula-template';
import { CUSTOM_TEMPLATE_VALUE, DimensionState, FormulaTemplate } from './dimension-face-fields';

/** 內建的基本型態（長條型／箱體型／平板型），資料庫已有同代碼的範本時以資料庫為準 */
const BUILT_IN_TEMPLATES: FormulaTemplate[] = DEFAULT_FORMULA_TEMPLATES.map((template) => ({
  _id: `builtin:${buildFormulaCode(template)}`,
  name: template.name,
  code: buildFormulaCode(template),
  lwFaces: template.lwFaces,
  lhFaces: template.lhFaces,
  whFaces: template.whFaces,
  isActive: true,
  isBuiltIn: true,
}));

function mergeWithBuiltIns(saved: FormulaTemplate[]): FormulaTemplate[] {
  const savedCodes = new Set(saved.map((template) => template.code));
  return [...saved, ...BUILT_IN_TEMPLATES.filter((template) => !savedCodes.has(template.code))];
}

/**
 * 快速報價與精算報價共用的輸入狀態：工件尺寸、面數公式範本、三個方向的面數。
 * 範本清單來自後台「才數公式範本」，未來新增 111 / 121 / 101 等公式不需要改前端。
 */
export function useCaiInput() {
  const [templates, setTemplates] = useState<FormulaTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [dimensions, setDimensions] = useState<DimensionState>({});
  const [faces, setFaces] = useState<FaceCounts>({ lwFaces: 0, lhFaces: 0, whFaces: 0 });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await fetch('/api/admin/workpiece-formula-templates');
        const result = await res.json();
        if (!mounted) return;
        setTemplates(mergeWithBuiltIns((result?.data || []).filter((t: FormulaTemplate) => t.isActive)));
      } catch (err) {
        console.error(err);
        // 讀不到資料庫範本時，至少保留內建的基本型態，報價流程不會卡住
        if (mounted) setTemplates(mergeWithBuiltIns([]));
      } finally {
        if (mounted) setTemplatesLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const selectTemplate = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      if (templateId === CUSTOM_TEMPLATE_VALUE) return;
      setTemplates((current) => {
        const template = current.find((t) => t._id === templateId);
        if (template) {
          setFaces({ lwFaces: template.lwFaces, lhFaces: template.lhFaces, whFaces: template.whFaces });
        }
        return current;
      });
    },
    [],
  );

  /** 手動調整面數後，選取狀態切換為「自訂」，避免顯示與實際面數不一致 */
  const updateFaces = useCallback(
    (next: FaceCounts) => {
      setFaces(next);
      setSelectedTemplateId((currentId) => {
        if (!currentId || currentId === CUSTOM_TEMPLATE_VALUE) return currentId;
        const template = templates.find((t) => t._id === currentId);
        const matchesTemplate =
          template &&
          template.lwFaces === next.lwFaces &&
          template.lhFaces === next.lhFaces &&
          template.whFaces === next.whFaces;
        return matchesTemplate ? currentId : CUSTOM_TEMPLATE_VALUE;
      });
    },
    [templates],
  );

  const hasFaces = faces.lwFaces + faces.lhFaces + faces.whFaces > 0;
  const hasDimensions = Boolean(dimensions.length && dimensions.width) || Boolean(dimensions.length && dimensions.height);

  return {
    templates,
    templatesLoading,
    dimensions,
    setDimensions,
    faces,
    setFaces: updateFaces,
    selectedTemplateId,
    selectTemplate,
    hasFaces,
    hasDimensions,
    /** 送給 API 用的面數欄位 */
    facePayload: { lwFaces: faces.lwFaces, lhFaces: faces.lhFaces, whFaces: faces.whFaces },
    // 內建型態沒有資料庫 id，不送給後端（面數本來就會整組快照進報價紀錄）
    formulaTemplateId:
      !selectedTemplateId || selectedTemplateId === CUSTOM_TEMPLATE_VALUE || selectedTemplateId.startsWith('builtin:')
        ? undefined
        : selectedTemplateId,
  };
}
